from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import schemas
from database import get_db
from admin_auth import require_admin
from tournament import services

router = APIRouter(prefix="/history", tags=["tournaments"])


@router.get("", response_model=List[schemas.Tournament])
async def get_history(database_session: AsyncSession = Depends(get_db)):
    """Get all tournaments with their rank groups and players"""
    return await services.get_all_tournaments(database_session)


@router.post("", status_code=status.HTTP_201_CREATED)
async def add_tournament(
    tournament: schemas.TournamentCreate, 
    admin = Depends(require_admin),
    database_session: AsyncSession = Depends(get_db)
):
    """Create a new tournament"""

    services.validate_tournament_rules(tournament)
    return await services.create_tournament(tournament, database_session)


@router.put("/{tournament_id}")
async def update_tournament(
    tournament_id: str,
    tournament: schemas.TournamentCreate,
    admin = Depends(require_admin),
    database_session: AsyncSession = Depends(get_db)
):
    """Update an existing tournament"""

    services.validate_tournament_rules(tournament)
    return await services.update_tournament(tournament_id, tournament, database_session)


@router.patch("/{tournament_id}/unofficial-details")
async def update_unofficial_tournament_details(
    tournament_id: str,
    details: schemas.UnofficialTournamentDetailsUpdate,
    admin = Depends(require_admin),
    database_session: AsyncSession = Depends(get_db),
):
    return await services.update_unofficial_tournament_details(tournament_id, details, database_session)


@router.delete("/{tournament_id}")
async def delete_tournament(
    tournament_id: str,
    admin = Depends(require_admin),
    database_session: AsyncSession = Depends(get_db)
):
    """Delete a tournament"""

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


@router.post("/create-unofficial", status_code=status.HTTP_201_CREATED)
async def create_unofficial_tournament(
    request: schemas.CreateUnofficialTournamentRequest,
    admin = Depends(require_admin),
    database_session: AsyncSession = Depends(get_db)
):
    """Create an unofficial tournament entry for cost tracking"""
    
    return await services.create_unofficial_tournament(request, database_session)
