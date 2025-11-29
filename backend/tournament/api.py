from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import schemas
from database import get_db
from tournament import services

router = APIRouter(prefix="/history", tags=["tournaments"])


@router.get("", response_model=List[schemas.Tournament])
async def get_history(database_session: AsyncSession = Depends(get_db)):
    """Get all tournaments with their rank groups and players"""
    return await services.get_all_tournaments(database_session)


@router.post("", status_code=status.HTTP_201_CREATED)
async def add_tournament(
    tournament: schemas.TournamentCreate, 
    password: str,
    database_session: AsyncSession = Depends(get_db)
):
    """Create a new tournament"""
    if password != "ss_admin_panel":
        raise HTTPException(status_code=403, detail="Invalid password")

    services.validate_tournament_rules(tournament)
    return await services.create_tournament(tournament, database_session)


@router.put("/{tournament_id}")
async def update_tournament(
    tournament_id: str,
    tournament: schemas.TournamentCreate,
    password: str,
    database_session: AsyncSession = Depends(get_db)
):
    """Update an existing tournament"""
    if password != "ss_admin_panel":
        raise HTTPException(status_code=403, detail="Invalid password")

    services.validate_tournament_rules(tournament)
    return await services.update_tournament(tournament_id, tournament, database_session)


@router.delete("/{tournament_id}")
async def delete_tournament(
    tournament_id: str,
    password: str,
    database_session: AsyncSession = Depends(get_db)
):
    """Delete a tournament"""
    if password != "ss_admin_panel":
        raise HTTPException(status_code=403, detail="Invalid password")

    return await services.delete_tournament(tournament_id, database_session)


@router.get("/players-by-date")
async def get_tournament_players_by_date(
    date: str,
    database_session: AsyncSession = Depends(get_db)
):
    """Get list of players who played in a tournament on a specific date"""
    from datetime import datetime
    try:
        tournament_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    return await services.get_tournament_players_by_date(tournament_date, database_session)
