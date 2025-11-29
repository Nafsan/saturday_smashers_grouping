from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
import models, schemas


async def get_all_tournaments(database_session: AsyncSession):
    """Fetch all tournaments with related data"""
    query_result = await database_session.execute(
        select(models.Tournament)
        .options(
            selectinload(models.Tournament.rank_groups)
            .selectinload(models.RankGroup.players)
        )
        .order_by(models.Tournament.date.desc())
    )
    tournaments = query_result.scalars().all()
    
    # Transform to match schema (RankGroup.players needs to be list of strings)
    # Pydantic's orm_mode might struggle with the M2M relationship directly mapping to List[str]
    # We might need a custom response model or manual transformation.
    # Let's do manual transformation for simplicity and robustness.
    
    response = []
    for tournament in tournaments:
        rank_groups_list = []
        for rank_group in tournament.rank_groups:
            rank_groups_list.append({
                "id": rank_group.id,
                "tournament_id": rank_group.tournament_id,
                "rank": rank_group.rank,
                "rating": rank_group.rating,
                "players": [player.name for player in rank_group.players]
            })
        response.append({
            "id": tournament.id,
            "date": tournament.date,
            "playlist_url": tournament.playlist_url,
            "embed_url": tournament.embed_url,
            "ranks": rank_groups_list
        })
        
    return response


def validate_tournament_rules(tournament: schemas.TournamentCreate):
    """Validate tournament rules and constraints"""
    all_players = []
    ratings_present = {}

    for rank_group in tournament.ranks:
        ratings_present[rank_group.rating] = len(rank_group.players)
        all_players.extend(rank_group.players)

        # Max players validation based on rating (not rank, since ranks are dynamic)
        # Rating 3 = Cup Semi-Finals, Rating 7 = Plate Semi-Finals
        if rank_group.rating in [3, 7] and len(rank_group.players) != 2:
            bracket_type = "Cup" if rank_group.rating == 3 else "Plate"
            raise HTTPException(
                status_code=400, 
                detail=f"{bracket_type} Semi-Finals must have exactly 2 players."
            )
        
        # Rating 4 = Cup Quarter-Finals, Rating 8 = Plate Quarter-Finals
        if rank_group.rating in [4, 8] and len(rank_group.players) > 4:
            bracket_type = "Cup" if rank_group.rating == 4 else "Plate"
            raise HTTPException(
                status_code=400, 
                detail=f"{bracket_type} Quarter-Finals cannot have more than 4 players."
            )

    # Unique players validation
    if len(all_players) != len(set(all_players)):
        raise HTTPException(status_code=400, detail="A player cannot be present multiple times in the same tournament.")

    # Mandatory ratings validation (based on rating, not rank)
    # Cup: 1 (Champ), 2 (Runner), 3 (Semis)
    # Plate: 5 (Champ), 6 (Runner), 7 (Semis)
    mandatory_ratings = {
        1: "Cup Champion",
        2: "Cup Runner Up",
        3: "Cup Semi Finalists",
        5: "Plate Champion",
        6: "Plate Runner Up",
        7: "Plate Semi Finalists"
    }

    for rating_number, rating_name in mandatory_ratings.items():
        if rating_number not in ratings_present or ratings_present[rating_number] == 0:
            raise HTTPException(status_code=400, detail=f"{rating_name} is mandatory.")


async def create_tournament(tournament: schemas.TournamentCreate, database_session: AsyncSession):
    """Create a new tournament with rank groups and players"""
    # Check if exists
    existing_tournament_query = await database_session.execute(
        select(models.Tournament).where(models.Tournament.id == tournament.id)
    )
    if existing_tournament_query.scalar():
        raise HTTPException(status_code=400, detail="Tournament ID already exists")

    # Create Tournament
    database_tournament = models.Tournament(
        id=tournament.id, 
        date=tournament.date,
        playlist_url=tournament.playlist_url,
        embed_url=tournament.embed_url
    )
    database_session.add(database_tournament)
    
    # Track all players for days_played update
    all_players = []
    
    for rank_group in tournament.ranks:
        database_rank_group = models.RankGroup(
            rank=rank_group.rank, 
            rating=rank_group.rating, 
            tournament_id=tournament.id
        )
        
        # Handle Players
        for player_name in rank_group.players:
            # Check if player exists
            player_query_result = await database_session.execute(
                select(models.Player).where(models.Player.name == player_name)
            )
            existing_player = player_query_result.scalar()
            
            if not existing_player:
                existing_player = models.Player(name=player_name)
                database_session.add(existing_player)
                await database_session.flush() # Get ID
            
            database_rank_group.players.append(existing_player)
            all_players.append(player_name)
            
        database_session.add(database_rank_group)

    await database_session.commit()
    
    # Update days_played for all tournament players
    try:
        from fund_models import PlayerFund
        
        for player_name in all_players:
            # Get player by name
            player_result = await database_session.execute(
                select(models.Player).where(models.Player.name == player_name)
            )
            player = player_result.scalar()
            
            if player:
                # Get or create player fund
                fund_result = await database_session.execute(
                    select(PlayerFund).where(PlayerFund.player_id == player.id)
                )
                player_fund = fund_result.scalar()
                
                if player_fund:
                    # Increment days_played
                    player_fund.days_played += 1
                else:
                    # Create new fund record if doesn't exist
                    player_fund = PlayerFund(
                        player_id=player.id,
                        current_balance=0.0,
                        days_played=1,
                        total_paid=0.0,
                        total_cost=0.0
                    )
                    database_session.add(player_fund)
        
        await database_session.commit()
    except Exception as e:
        # Don't fail tournament creation if fund update fails
        print(f"Warning: Failed to update player fund days_played: {e}")
    
    return {"message": "Tournament added successfully"}


async def update_tournament(tournament_id: str, tournament: schemas.TournamentCreate, database_session: AsyncSession):
    """Update an existing tournament"""
    # Check if exists
    tournament_query_result = await database_session.execute(
        select(models.Tournament).where(models.Tournament.id == tournament_id)
    )
    database_tournament = tournament_query_result.scalar()
    
    if not database_tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    # Update Date and URLs
    database_tournament.date = tournament.date
    database_tournament.playlist_url = tournament.playlist_url
    database_tournament.embed_url = tournament.embed_url
    
    # Delete existing rank groups (cascade should handle associations if configured, but let's be explicit)
    # Actually, we need to delete RankGroups associated with this tournament.
    # The association table rank_group_players will be cleaned up if we delete RankGroup.
    
    # Fetch existing rank groups to delete them
    existing_rank_groups_query = await database_session.execute(
        select(models.RankGroup).where(models.RankGroup.tournament_id == tournament_id)
    )
    existing_rank_groups = existing_rank_groups_query.scalars().all()
    
    for existing_rank_group in existing_rank_groups:
        await database_session.delete(existing_rank_group)
        
    # Re-create Ranks
    for rank_group in tournament.ranks:
        database_rank_group = models.RankGroup(
            rank=rank_group.rank, 
            rating=rank_group.rating, 
            tournament_id=tournament_id
        )
        
        for player_name in rank_group.players:
            # Find or Create Player
            player_query_result = await database_session.execute(
                select(models.Player).where(models.Player.name == player_name)
            )
            existing_player = player_query_result.scalar()
            
            if not existing_player:
                existing_player = models.Player(name=player_name)
                database_session.add(existing_player)
                await database_session.flush()
            
            database_rank_group.players.append(existing_player)
            
        database_session.add(database_rank_group)

    await database_session.commit()
    return {"message": "Tournament updated successfully"}


async def delete_tournament(tournament_id: str, database_session: AsyncSession):
    """Delete a tournament and its associated rank groups"""
    # Check if exists
    tournament_query_result = await database_session.execute(
        select(models.Tournament).where(models.Tournament.id == tournament_id)
    )
    database_tournament = tournament_query_result.scalar()
    
    if not database_tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    # Delete RankGroups associated with this tournament
    # (Explicitly deleting them, though cascade might handle it depending on DB setup)
    rank_groups_query_result = await database_session.execute(
        select(models.RankGroup).where(models.RankGroup.tournament_id == tournament_id)
    )
    existing_rank_groups = rank_groups_query_result.scalars().all()
    
    for existing_rank_group in existing_rank_groups:
        await database_session.delete(existing_rank_group)

    # Delete the tournament itself
    await database_session.delete(database_tournament)
    
    await database_session.commit()
    return {"message": "Tournament deleted successfully"}


async def get_tournament_players_by_date(tournament_date, database_session: AsyncSession):
    """Get list of players who played in a tournament on a specific date"""
    # Get tournament by date
    tournament_query_result = await database_session.execute(
        select(models.Tournament)
        .where(models.Tournament.date == tournament_date)
        .options(
            selectinload(models.Tournament.rank_groups)
            .selectinload(models.RankGroup.players)
        )
    )
    tournament = tournament_query_result.scalar()
    
    if not tournament:
        raise HTTPException(status_code=404, detail=f"Tournament not found for date {tournament_date}")
    
    # Extract unique player names from all rank groups
    player_names = set()
    for rank_group in tournament.rank_groups:
        for player in rank_group.players:
            player_names.add(player.name)
    
    return {"players": sorted(list(player_names))}
