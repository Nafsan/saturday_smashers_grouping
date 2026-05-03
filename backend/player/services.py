from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
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
    
    return {"id": new_player.id, "name": new_player.name}


async def get_all_players(database_session: AsyncSession):
    """Get all players"""
    query_result = await database_session.execute(select(models.Player).order_by(models.Player.name))
    players = query_result.scalars().all()
    return [{"id": player.id, "name": player.name} for player in players]


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
HF_MODEL = "Qwen/Qwen2.5-7B-Instruct"

async def generate_player_insight(player_id: int, database_session: AsyncSession):
    """Generate an AI insight for a player using Hugging Face"""
    # Get token inside function to ensure it's loaded from .env
    hf_token = os.getenv("HF_TOKEN")
    
    if not hf_token:
        logger.warning("HF_TOKEN not found in environment variables.")
        return {"insight": "AI Insights are currently unavailable (HF_TOKEN not configured)."}

    try:
        # Get player statistics first
        stats = await get_player_statistics(player_id, database_session)
        player_name = stats["player_name"]
        tournaments = stats["tournaments"]
        
        if not tournaments:
            return {"insight": f"Welcome to the club, {player_name}! Play some tournaments to see your AI performance insight."}

        # Calculate summary stats for the prompt
        total_tournaments = len(tournaments)
        cup_wins = 0
        plate_wins = 0
        recent_ratings = []
        
        for t in tournaments:
            for r in t["ranks"]:
                if player_name in r["players"]:
                    rating = r["rating"]
                    if rating == 1: cup_wins += 1
                    elif rating == 5: plate_wins += 1
                    recent_ratings.append(rating)
                    break
        
        recent_trend = recent_ratings
        logging.info(f"recent trend : {recent_trend}")
        
        # Map numbers to titles for the prompt to reduce hallucination
        rating_titles = {
            1: "Cup Champion", 2: "Cup Runner Up", 3: "Cup Semi Finalist", 4: "Cup Quarter Finalist",
            5: "Plate Champion", 6: "Plate Runner Up", 7: "Plate Semi Finalist", 8: "Plate Quarter Finalist"
        }
        
        # Pre-calculate key milestones to prevent LLM hallucination
        best_rating = min(recent_ratings) if recent_ratings else 8
        best_title = rating_titles.get(best_rating, "N/A")
        most_recent_title = rating_titles.get(recent_ratings[0], "N/A") if recent_ratings else "N/A"
        last_5_titles = [rating_titles.get(r, "N/A") for r in recent_ratings[:5]]
        
        # Create a more descriptive history string for the LLM
        history_descriptions = []
        for i, r in enumerate(recent_ratings):
            title = rating_titles.get(r, f"Rank {r}")
            pos = i + 1
            if pos == 1: suffix = "st (LATEST)"
            elif pos == 2: suffix = "nd"
            elif pos == 3: suffix = "rd"
            else: suffix = "th"
            
            if i == len(recent_ratings) - 1 and i > 0:
                suffix += " (OLDEST)"
                
            history_descriptions.append(f"- {pos}{suffix}: {title}")
        
        formatted_history = "\n".join(history_descriptions)
        
        logging.info(f"formatted history : {formatted_history}")
        
        # Initialize inference client
        client = InferenceClient(token=hf_token)
        
        prompt = f"""<|system|>
You are an honest and analytical sports commentator for a table tennis club called 'Saturday Smashers'. 
Your goal is to provide a realistic "reality check" of a player's performance based on their data.

STRICT CONSTRAINTS:
1. Return ONLY a JSON object with keys "comment" and "summary".
2. DO NOT include ANY numeric ratings in parentheses in your text.
3. Use the 'GROUND TRUTH STATS' below as your primary source of truth.
4. DO NOT hallucinate achievements. If a title is not in the history, it never happened.
5. Tournaments happen WEEKLY. Do not refer to "years" or long timeframes.

Provide:
1. A short, insightful 1-sentence analytical comment.
2. A detailed 2-3 sentence performance summary.</s>
<|user|>
Analyze these stats for {player_name}:
- Total Tournaments: {total_tournaments} (Weekly frequency)

GROUND TRUTH STATS:
- Most Recent Result: {most_recent_title}
- Best Ever Result: {best_title}
- Last 5 Tournament Results: {", ".join(last_5_titles)}
- Total Cup Championship Wins: {cup_wins}
- Total Plate Championship Wins: {plate_wins}

PLAYER HISTORY (Ordered LATEST to OLDEST):
{formatted_history}

Important Context:
- 'Cup' tiers (Champion to Quarter Finalist) are elite/supreme levels.
- 'Plate' tiers are lower/relegated levels.
- If 'Total Cup Championship Wins' is 0, they have NEVER won the Cup.

Return the JSON object.</s>
<|assistant|>"""

        logger.info(f"Generating dual AI insight for player {player_name}...")
        
        response = client.chat_completion(
            model=HF_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=250,
            temperature=0.7
        )
        
        content = response.choices[0].message.content.strip()
        
        # Simple JSON parsing (the model might wrap it in markdown code blocks)
        import json
        import re
        
        try:
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                insight = data.get("comment", "")
                summary = data.get("summary", "")
            else:
                # Fallback if no JSON found
                insight = content
                summary = ""
        except:
            insight = content
            summary = ""
            
        logger.info("AI insight and summary generated successfully.")
        return {
            "insight": insight,
            "performance_summary": summary
        }

    except Exception as e:
        logger.error(f"Error generating AI insight: {str(e)}", exc_info=True)
        error_msg = str(e).lower()
        if "loading" in error_msg:
            return {
                "insight": "The AI model is currently warming up.",
                "performance_summary": "Please try again in a minute!"
            }
        
        return {
            "insight": "The AI is currently resting.",
            "performance_summary": "Please try again later!"
        }
