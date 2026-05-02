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
        
        recent_trend = recent_ratings[:10]
        logging.info(f"recent trend : {recent_trend}")
        
        # Initialize inference client
        client = InferenceClient(token=hf_token)
        
        prompt = f"""<|system|>
You are an enthusiastic sports commentator for a table tennis club called 'Saturday Smashers'. 
Your goal is to provide two things for a player's performance:
1. A short, encouraging 1-sentence comment.
2. A more detailed 2-3 sentence overall performance summary based on their stats.

Return ONLY a JSON object with keys "comment" and "summary". Keep it punchy, friendly, and analytical.</s>
<|user|>
Analyze these stats for {player_name}:
- Total Tournaments: {total_tournaments}
- Cup Championships: {cup_wins}
- Plate Championships: {plate_wins}
- Recent Ratings Trend (1 is best, 8 is worst, ordered from LATEST to OLDEST): {recent_trend}

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
