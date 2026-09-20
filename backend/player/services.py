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
                    "cup_win_rate": "0%",
                    "podium_rate": "0%",
                    "best_partner": "N/A",
                    "total_tournaments": "0"
                },
                "key_insights": [
                    {
                        "category": "strength",
                        "title": "Fresh Entry",
                        "text": f"{player_name} is ready to make their debut in Saturday Smashers tournaments."
                    }
                ],
                "tactical_summary": "Play tournaments to unlock personalized performance analytics and partner synergy insights.",
                "insight": f"Welcome to the club, {player_name}! Play some tournaments to see your AI performance insight.",
                "performance_summary": "Play tournaments to see your performance summary."
            }

        # Calculate rich deterministic analytics for SINGLES tournaments
        rating_titles = {
            1: "Cup Champion", 2: "Cup Runner Up", 3: "Cup Semi Finalist", 4: "Cup Quarter Finalist",
            5: "Plate Champion", 6: "Plate Runner Up", 7: "Plate Semi Finalist", 8: "Plate Quarter Finalist"
        }
        rating_values = {1: 95, 2: 85, 3: 75, 4: 65, 5: 50, 6: 40, 7: 30, 8: 20}
        
        all_ratings = []
        rivals_map = {} # opponent_name -> {finals_against, finals_won, finals_lost, shared_tournaments}
        
        for t in tournaments:
            player_rating = None
            other_ratings = {}
            
            for r in t["ranks"]:
                for p in r["players"]:
                    if p == player_name:
                        player_rating = r["rating"]
                    else:
                        other_ratings[p] = r["rating"]
            
            if player_rating is not None:
                all_ratings.append(player_rating)
                
                for o_name, o_rating in other_ratings.items():
                    if o_name not in rivals_map:
                        rivals_map[o_name] = {"finals_against": 0, "finals_won": 0, "finals_lost": 0, "shared_tournaments": 0}
                    rivals_map[o_name]["shared_tournaments"] += 1
                    
                    # Cup Final (1 vs 2) or Plate Final (5 vs 6)
                    if (player_rating == 1 and o_rating == 2) or (player_rating == 2 and o_rating == 1):
                        rivals_map[o_name]["finals_against"] += 1
                        if player_rating == 1: rivals_map[o_name]["finals_won"] += 1
                        else: rivals_map[o_name]["finals_lost"] += 1
                    elif (player_rating == 5 and o_rating == 6) or (player_rating == 6 and o_rating == 5):
                        rivals_map[o_name]["finals_against"] += 1
                        if player_rating == 5: rivals_map[o_name]["finals_won"] += 1
                        else: rivals_map[o_name]["finals_lost"] += 1

        total = len(all_ratings)
        cup_wins = sum(1 for r in all_ratings if r == 1)
        cup_finals = sum(1 for r in all_ratings if r in [1, 2])
        cup_podiums = sum(1 for r in all_ratings if r in [1, 2, 3])
        cup_appearances = sum(1 for r in all_ratings if r in [1, 2, 3, 4])
        plate_wins = sum(1 for r in all_ratings if r == 5)
        plate_podiums = sum(1 for r in all_ratings if r in [5, 6, 7])

        cup_win_rate = round((cup_wins / total) * 100)
        podium_rate = round(((cup_podiums + plate_podiums) / total) * 100)

        recent_5 = all_ratings[:5]
        recent_avg_val = sum(rating_values[r] for r in recent_5) / len(recent_5)
        form_score = max(15, min(99, int(round(recent_avg_val))))

        recent_avg_rank = sum(recent_5) / len(recent_5)
        overall_avg_rank = sum(all_ratings) / total

        variance = sum((x - recent_avg_rank) ** 2 for x in recent_5) / len(recent_5)
        std_dev_recent = math.sqrt(variance)

        if len(recent_5) >= 2 and recent_avg_rank < overall_avg_rank - 0.4:
            momentum = "Heating Up"
        elif recent_avg_rank <= 1.8:
            momentum = "Peak Form"
        elif recent_avg_rank > overall_avg_rank + 0.6:
            momentum = "Slumping"
        elif std_dev_recent >= 2.0:
            momentum = "Volatile"
        else:
            momentum = "Steady"

        total_var = sum((x - overall_avg_rank) ** 2 for x in all_ratings) / total
        std_dev_total = math.sqrt(total_var)
        if std_dev_total < 1.2:
            consistency = "Rock Solid"
        elif std_dev_total < 2.2:
            consistency = "Balanced"
        else:
            consistency = "Streak-Based"

        top_rival_str = "N/A"
        if rivals_map:
            sorted_rivals = sorted(
                rivals_map.items(),
                key=lambda x: (x[1]["finals_against"], x[1]["shared_tournaments"]),
                reverse=True
            )
            top_name, top_data = sorted_rivals[0]
            if top_data["finals_against"] > 0:
                top_rival_str = f"{top_name} ({top_data['finals_against']} Finals: {top_data['finals_won']}W-{top_data['finals_lost']}L)"
            else:
                top_rival_str = f"{top_name} ({top_data['shared_tournaments']} Tournaments)"

        if cup_win_rate >= 35:
            archetype = "Elite Cup Champion"
        elif (cup_finals / total) >= 0.5:
            archetype = "Clutch Cup Finalist"
        elif (cup_appearances / total) >= 0.65:
            archetype = "Cup Division Mainstay"
        elif plate_wins >= 2:
            archetype = "Plate Division Powerhouse"
        elif total <= 3:
            archetype = "Rising Contender"
        else:
            archetype = "Resilient Competitor"

        # LLM Generation
        hf_token = os.getenv("HF_TOKEN")
        if hf_token:
            try:
                client = InferenceClient(token=hf_token)
                prompt = f"""<|system|>
You are an expert sports performance analyst for a competitive table tennis club called 'Saturday Smashers' (Singles Tournaments).
Generate a deep, structured performance analysis based on the verified player statistical metrics provided.

STRICT REQUIREMENTS:
1. Output MUST be ONLY a valid JSON object matching the format below.
2. DO NOT wrap JSON in codeblocks or markdown.
3. Be analytical, professional, concise, and specific to the player's data.
4. NOTE: All tournaments are SINGLES tournaments. DO NOT mention doubles or partners.

JSON SCHEMA:
{{
  "archetype": "{archetype}",
  "headline": "A punchy, data-backed 1-sentence headline capturing current form.",
  "key_insights": [
    {{
      "category": "strength",
      "title": "Short Title (2-4 words)",
      "text": "1-2 analytical sentences focusing on key strengths or conversion rate."
    }},
    {{
      "category": "rivalry",
      "title": "Short Title (2-4 words)",
      "text": "1-2 analytical sentences focusing on head-to-head rivalries and finals matchups."
    }},
    {{
      "category": "growth",
      "title": "Short Title (2-4 words)",
      "text": "1-2 analytical sentences highlighting area for growth or tactical refinement."
    }}
  ],
  "tactical_summary": "2-sentence actionable tactical recommendation for upcoming tournaments."
}}
</s>
<|user|>
Player Performance Analytics for {player_name}:
- Total Tournaments Played: {total} (Singles)
- Cup Wins: {cup_wins} (Cup Win Rate: {cup_win_rate}%)
- Cup Finals Appearances: {cup_finals}
- Overall Podium Rate: {podium_rate}%
- Calculated Form Rating: {form_score}/100
- Momentum Trend: {momentum}
- Consistency Profile: {consistency}
- Top Final Rival / Competitor: {top_rival_str}

RECENT FORM (LAST 5 TOURNAMENTS):
{", ".join([f"Week {i+1}: {rating_titles[r]}" for i, r in enumerate(recent_5)])}

CAREER BASELINE:
- Career Best Finish: {rating_titles[min(all_ratings)]}
- Total Cup Finals: {cup_finals}, Total Plate Wins: {plate_wins}
</s>
<|assistant|>"""

                response = client.chat_completion(
                    model=HF_MODEL,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=450,
                    temperature=0.3
                )
                
                content = response.choices[0].message.content.strip()
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    ai_data = json.loads(json_match.group())
                    headline = ai_data.get("headline", f"{player_name} continues to compete actively in Saturday Smashers.")
                    key_insights = ai_data.get("key_insights", [])
                    tactical = ai_data.get("tactical_summary", "Focus on consistent serve execution and tactical placement.")
                    archetype_res = ai_data.get("archetype", archetype)
                    
                    return {
                        "archetype": archetype_res,
                        "headline": headline,
                        "form_score": form_score,
                        "momentum": momentum,
                        "consistency": consistency,
                        "metrics": {
                            "cup_win_rate": f"{cup_win_rate}%",
                            "podium_rate": f"{podium_rate}%",
                            "best_partner": top_rival_str, # preserved key for compatibility
                            "top_rival": top_rival_str,
                            "total_tournaments": str(total)
                        },
                        "key_insights": key_insights,
                        "tactical_summary": tactical,
                        "insight": headline,
                        "performance_summary": tactical
                    }
            except Exception as llm_err:
                logger.error(f"LLM generation warning: {llm_err}")

        # Deterministic fallback if LLM is unavailable
        return {
            "archetype": archetype,
            "headline": f"{player_name} holds a {podium_rate}% podium rate across {total} singles tournaments.",
            "form_score": form_score,
            "momentum": momentum,
            "consistency": consistency,
            "metrics": {
                "cup_win_rate": f"{cup_win_rate}%",
                "podium_rate": f"{podium_rate}%",
                "best_partner": top_rival_str,
                "top_rival": top_rival_str,
                "total_tournaments": str(total)
            },
            "key_insights": [
                {
                    "category": "strength",
                    "title": "Proven Competition Form",
                    "text": f"Secured {cup_wins} Cup championships and {cup_finals} Cup final appearances."
                },
                {
                    "category": "rivalry",
                    "title": "Key Rivalry",
                    "text": f"Frequent final matchup competitor: {top_rival_str}."
                },
                {
                    "category": "growth",
                    "title": "Consistency Refinement",
                    "text": f"Currently maintaining a {consistency.lower()} performance trajectory with a {momentum.lower()} momentum rating."
                }
            ],
            "tactical_summary": f"{player_name} should maintain serve-and-attack momentum to stay competitive in upcoming Saturday Smashers tournaments.",
            "insight": f"{player_name} holds a {podium_rate}% podium rate across {total} singles tournaments.",
            "performance_summary": f"Maintaining a {consistency.lower()} trajectory with {momentum.lower()} momentum."
        }

    except Exception as e:
        logger.error(f"Error generating AI insight: {str(e)}", exc_info=True)
        return {
            "archetype": "Player",
            "headline": "AI Performance Analytics currently resting.",
            "form_score": 50,
            "momentum": "Steady",
            "consistency": "N/A",
            "metrics": {"cup_win_rate": "0%", "podium_rate": "0%", "best_partner": "N/A", "total_tournaments": "0"},
            "key_insights": [],
            "tactical_summary": "Please try again later!",
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
