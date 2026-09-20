from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, case
import models


async def create_player(player_name: str, database_session: AsyncSession):
    """Create a new player with validation"""
    # Validate player name
    if not player_name or not player_name.strip():
        raise HTTPException(status_code=400, detail="Player name cannot be empty")
    
    player_name = player_name.strip()
    
    # Check if player already exists
    existing_player_query = await database_session.execute(
        select(models.Player).where(models.Player.name == player_name)
    )
    existing_player = existing_player_query.scalar()
    
    if existing_player:
        raise HTTPException(status_code=400, detail=f"Player '{player_name}' already exists")
    
    # Create new player
    new_player = models.Player(name=player_name)
    database_session.add(new_player)
    await database_session.commit()
    await database_session.refresh(new_player)
    
    return {"id": new_player.id, "name": new_player.name, "is_guest": new_player.is_guest}


async def get_all_players(database_session: AsyncSession):
    """Get all players"""
    query_result = await database_session.execute(select(models.Player).order_by(models.Player.name))
    players = query_result.scalars().all()
    return [{"id": player.id, "name": player.name, "is_guest": player.is_guest} for player in players]


async def update_player_guest_status(player_id: int, is_guest: bool, database_session: AsyncSession):
    """Update a player's guest status"""
    player_query = await database_session.execute(
        select(models.Player).where(models.Player.id == player_id)
    )
    player = player_query.scalar()
    
    if not player:
        raise HTTPException(status_code=404, detail=f"Player with ID {player_id} not found")
    
    player.is_guest = is_guest
    await database_session.commit()
    await database_session.refresh(player)
    
    return {"id": player.id, "name": player.name, "is_guest": player.is_guest}


async def get_player_statistics(player_id: int, database_session: AsyncSession):
    """Get tournament statistics for a specific player"""
    from sqlalchemy.orm import selectinload
    
    # First, check if player exists
    player_query = await database_session.execute(
        select(models.Player).where(models.Player.id == player_id)
    )
    player = player_query.scalar()
    
    if not player:
        raise HTTPException(status_code=404, detail=f"Player with ID {player_id} not found")
    
    # Get all tournaments where this player participated
    tournaments_query = await database_session.execute(
        select(models.Tournament)
        .join(models.Tournament.rank_groups)
        .join(models.RankGroup.players)
        .where(models.Player.id == player_id)
        .options(
            selectinload(models.Tournament.rank_groups)
            .selectinload(models.RankGroup.players)
        )
        .order_by(models.Tournament.date.desc())
    )
    tournaments = tournaments_query.unique().scalars().all()
    
    # Transform to response format
    response = []
    for tournament in tournaments:
        rank_groups_list = []
        for rank_group in tournament.rank_groups:
            rank_groups_list.append({
                "id": rank_group.id,
                "tournament_id": rank_group.tournament_id,
                "rank": rank_group.rank,
                "rating": rank_group.rating,
                "players": [p.name for p in rank_group.players]
            })
        response.append({
            "id": tournament.id,
            "date": tournament.date.isoformat(),
            "playlist_url": tournament.playlist_url,
            "embed_url": tournament.embed_url,
            "ranks": rank_groups_list
        })
    
    return {
        "player_id": player_id,
        "player_name": player.name,
        "tournaments": response
    }

import os
import logging
from huggingface_hub import InferenceClient

# Configure logger
logger = logging.getLogger(__name__)

# Model configuration
HF_MODEL = "Qwen/Qwen2.5-72B-Instruct"

async def generate_player_insight(player_id: int, database_session: AsyncSession):
    """Generate a rich, multi-dimensional AI performance insight for a player"""
    import math
    import json
    import re

    try:
        # Get player statistics first
        stats = await get_player_statistics(player_id, database_session)
        player_name = stats["player_name"]
        tournaments = stats["tournaments"]
        
        if not tournaments:
            return {
                "archetype": "New Contender",
                "headline": f"Welcome to Saturday Smashers, {player_name}!",
                "form_score": 50,
                "momentum": "Steady",
                "consistency": "N/A",
                "metrics": {
                    "cup_qual_rate": "0%",
                    "relegation_rate": "0%",
                    "cup_win_rate": "0%",
                    "peer_competitor": "N/A",
                    "total_tournaments": "0"
                },
                "key_insights": [
                    {
                        "category": "strength",
                        "title": "Fresh Entry",
                        "text": f"{player_name} is ready to make their debut in Saturday Smashers tournaments."
                    }
                ],
                "insight": f"Welcome to the club, {player_name}! Play some tournaments to see your AI performance insight.",
                "performance_summary": "Play tournaments to see your performance summary."
            }

        # Calculate rich deterministic analytics for SINGLES Cup/Plate tournaments
        rating_titles = {
            1: "Cup Champion", 2: "Cup Runner Up", 3: "Cup Semi Finalist", 4: "Cup Quarter Finalist",
            5: "Plate Champion", 6: "Plate Runner Up", 7: "Plate Semi Finalist", 8: "Plate Quarter Finalist"
        }
        rating_values = {1: 95, 2: 85, 3: 75, 4: 65, 5: 50, 6: 40, 7: 30, 8: 20}
        
        # Tier groupings: Finals opponents are natural peers (Champion & Runner Up face each other).
        # Group: Cup Final (1,2), Cup Semi (3), Cup Quarter (4),
        #        Plate Final (5,6), Plate Semi (7), Plate Quarter (8)
        def _peer_tier(rating):
            """Return a tier group id so that finals opponents map to the same tier."""
            if rating in (1, 2):   return 'cup_final'
            if rating in (5, 6):   return 'plate_final'
            if rating == 3:        return 'cup_semi'
            if rating == 4:        return 'cup_quarter'
            if rating == 7:        return 'plate_semi'
            if rating == 8:        return 'plate_quarter'
            return f'unknown_{rating}'

        all_ratings = []
        same_tier_peers = {}  # player -> {same_tier: count, shared: count}
        
        for t in tournaments:
            player_rating = None
            other_players_in_t = {}
            
            for r in t["ranks"]:
                for p in r["players"]:
                    if p == player_name:
                        player_rating = r["rating"]
                    else:
                        other_players_in_t[p] = r["rating"]
            
            if player_rating is not None:
                all_ratings.append(player_rating)
                player_tier = _peer_tier(player_rating)
                
                for o_name, o_rating in other_players_in_t.items():
                    if o_name not in same_tier_peers:
                        same_tier_peers[o_name] = {"same_tier": 0, "shared": 0}
                    same_tier_peers[o_name]["shared"] += 1
                    if _peer_tier(o_rating) == player_tier:
                        same_tier_peers[o_name]["same_tier"] += 1

        total = len(all_ratings)
        cup_appearances = sum(1 for r in all_ratings if r in [1, 2, 3, 4])
        plate_appearances = sum(1 for r in all_ratings if r in [5, 6, 7, 8])

        cup_wins = sum(1 for r in all_ratings if r == 1)
        cup_finals = sum(1 for r in all_ratings if r in [1, 2])
        plate_wins = sum(1 for r in all_ratings if r == 5)

        cup_qual_rate = round((cup_appearances / total) * 100)
        relegation_rate = round((plate_appearances / total) * 100)
        cup_win_rate = round((cup_wins / total) * 100)

        recent_5 = all_ratings[:5]
        recent_avg_val = sum(rating_values[r] for r in recent_5) / len(recent_5)
        form_score = max(15, min(99, int(round(recent_avg_val))))

        recent_cup_rate = (sum(1 for r in recent_5 if r <= 4) / len(recent_5)) * 100
        overall_cup_rate = (cup_appearances / total) * 100

        recent_avg_rank = sum(recent_5) / len(recent_5)
        overall_avg_rank = sum(all_ratings) / total

        variance = sum((x - recent_avg_rank) ** 2 for x in recent_5) / len(recent_5)
        std_dev_recent = math.sqrt(variance)

        if recent_cup_rate > overall_cup_rate + 10:
            momentum = "Heating Up"
        elif recent_avg_rank <= 2.0:
            momentum = "Peak Form"
        elif sum(1 for r in recent_5 if r >= 5) >= 2:
            momentum = "Relegation Risk"
        elif std_dev_recent >= 2.0:
            momentum = "Volatile"
        else:
            momentum = "Steady"

        std_dev_total = math.sqrt(sum((x - overall_avg_rank) ** 2 for x in all_ratings) / total)
        if std_dev_total < 1.2:
            consistency = "Rock Solid"
        elif std_dev_total < 2.2:
            consistency = "Balanced"
        else:
            consistency = "Inconsistent"

        peer_competitor_str = "N/A"
        if same_tier_peers:
            sorted_peers = sorted(
                same_tier_peers.items(),
                key=lambda x: (x[1]["same_tier"], x[1]["shared"]),
                reverse=True
            )
            p_name, p_data = sorted_peers[0]
            if p_data["same_tier"] > 0:
                peer_competitor_str = f"{p_name} ({p_data['same_tier']} Shared Levels)"
            else:
                peer_competitor_str = f"{p_name} ({p_data['shared']} Shared Tournaments)"

        if cup_qual_rate >= 80 and cup_wins >= 1:
            archetype = "Elite Cup Contender"
        elif cup_qual_rate >= 70:
            archetype = "Cup Division Regular"
        elif relegation_rate >= 50 and plate_wins >= 1:
            archetype = "Plate Division Fighter"
        elif total <= 3:
            archetype = "New Challenger"
        else:
            archetype = "Developing Player"

        # LLM Generation
        hf_token = os.getenv("HF_TOKEN")
        if hf_token:
            try:
                def _do_llm_call():
                    client = InferenceClient(token=hf_token, timeout=10)
                    return client.chat_completion(
                        model=HF_MODEL,
                        messages=[{"role": "user", "content": prompt}],
                        max_tokens=450,
                        temperature=0.3
                    )
                
                import asyncio
                response = await asyncio.to_thread(_do_llm_call)
                
                content = response.choices[0].message.content.strip()
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    ai_data = json.loads(json_match.group())
                    headline = ai_data.get("headline", f"{player_name} continues to compete actively in Saturday Smashers.")
                    key_insights = ai_data.get("key_insights", [])
                    archetype_res = ai_data.get("archetype", archetype)
                    
                    return {
                        "archetype": archetype_res,
                        "headline": headline,
                        "form_score": form_score,
                        "momentum": momentum,
                        "consistency": consistency,
                        "metrics": {
                            "cup_qual_rate": f"{cup_qual_rate}%",
                            "relegation_rate": f"{relegation_rate}%",
                            "cup_win_rate": f"{cup_win_rate}%",
                            "peer_competitor": peer_competitor_str,
                            "total_tournaments": str(total)
                        },
                        "key_insights": key_insights,
                        "insight": headline,
                        "performance_summary": f"Form score is {form_score}/100 with {momentum.lower()} momentum."
                    }
            except Exception as llm_err:
                logger.error(f"LLM generation warning: {llm_err}")

        # Deterministic fallback if LLM is unavailable
        return {
            "archetype": archetype,
            "headline": f"{player_name} holds a {cup_qual_rate}% Cup qualification rate across {total} tournaments.",
            "form_score": form_score,
            "momentum": momentum,
            "consistency": consistency,
            "metrics": {
                "cup_qual_rate": f"{cup_qual_rate}%",
                "relegation_rate": f"{relegation_rate}%",
                "cup_win_rate": f"{cup_win_rate}%",
                "peer_competitor": peer_competitor_str,
                "total_tournaments": str(total)
            },
            "key_insights": [
                {
                    "category": "strength",
                    "title": "Cup Qualification Record",
                    "text": f"Qualified for Cup division in {cup_appearances} of {total} tournaments ({cup_qual_rate}%)."
                },
                {
                    "category": "form_trend",
                    "title": "Recent Form Trajectory",
                    "text": f"Currently operating with a form score of {form_score}/100 and a {momentum.lower()} momentum rating."
                },
                {
                    "category": "growth",
                    "title": "Group Stage Goal",
                    "text": f"Relegated to Plate division in {plate_appearances} tournaments ({relegation_rate}%); improving group stage wins is key to staying in the Cup."
                }
            ],
            "insight": f"{player_name} holds a {cup_qual_rate}% Cup qualification rate across {total} tournaments.",
            "performance_summary": f"Form score is {form_score}/100 with {momentum.lower()} momentum."
        }

    except Exception as e:
        logger.error(f"Error generating AI insight: {str(e)}", exc_info=True)
        return {
            "archetype": "Player",
            "headline": "AI Performance Analytics currently resting.",
            "form_score": 50,
            "momentum": "Steady",
            "consistency": "N/A",
            "metrics": {
                "cup_qual_rate": "0%",
                "relegation_rate": "0%",
                "cup_win_rate": "0%",
                "peer_competitor": "N/A",
                "total_tournaments": "0"
            },
            "key_insights": [],
            "insight": "The AI is currently resting.",
            "performance_summary": "Please try again later!"
        }

async def get_trophy_leaderboard(database_session: AsyncSession):
    """Fetch the trophy count for players (only players having a trophy will be returned) along with their total tournaments played"""
    query = (
        select(
            models.Player.name, 
            func.count(case((models.RankGroup.rating == 1, models.RankGroup.id))).label("trophy_count"),
            func.count(models.RankGroup.id).label("tournaments_played")
        )
        .join(models.Player.rank_groups)
        .group_by(models.Player.id, models.Player.name)
        .having(func.count(case((models.RankGroup.rating == 1, models.RankGroup.id))) > 0)
        .order_by(
            func.count(case((models.RankGroup.rating == 1, models.RankGroup.id))).desc(), 
            func.count(models.RankGroup.id).asc(),
            models.Player.name
        )
    )
    result = await database_session.execute(query)
    leaderboard = result.all()
    
    return [
        {
            "name": row.name, 
            "trophy_count": row.trophy_count, 
            "tournaments_played": row.tournaments_played
        } for row in leaderboard
    ]
