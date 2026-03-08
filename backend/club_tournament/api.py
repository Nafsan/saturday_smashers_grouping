"""
API routes for the Club Tournament module.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from database import get_db, ADMIN_PASSWORD
from club_tournament import services
from club_tournament.schemas import (
    ClubVenueCreate,
    ClubVenueUpdate,
    ClubVenueResponse,
    ClubTournamentCreate,
    ClubTournamentUpdate,
    ClubTournamentResultCreate,
    ClubTournamentResultUpdate,
    BulkTournamentImport,
)
from club_tournament.constants import ERROR_INVALID_PASSWORD

router = APIRouter(tags=["club-tournaments"])


def _verify_admin(password: str):
    """Verify admin password."""
    if password != ADMIN_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ERROR_INVALID_PASSWORD,
        )


# ============ Venue Endpoints ============

@router.get("/club-venues", response_model=List[ClubVenueResponse])
async def list_venues(db: AsyncSession = Depends(get_db)):
    """Get all venues."""
    return await services.get_all_venues(db)


@router.post("/club-venues", response_model=ClubVenueResponse, status_code=status.HTTP_201_CREATED)
async def create_venue(
    data: ClubVenueCreate,
    password: str,
    db: AsyncSession = Depends(get_db),
):
    """Create a new venue (admin only)."""
    _verify_admin(password)
    return await services.create_venue(data, db)


@router.put("/club-venues/{venue_id}", response_model=ClubVenueResponse)
async def update_venue(
    venue_id: int,
    data: ClubVenueUpdate,
    password: str,
    db: AsyncSession = Depends(get_db),
):
    """Update a venue (admin only)."""
    _verify_admin(password)
    return await services.update_venue(venue_id, data, db)


@router.delete("/club-venues/{venue_id}")
async def delete_venue(
    venue_id: int,
    password: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a venue (admin only)."""
    _verify_admin(password)
    return await services.delete_venue(venue_id, db)


# ============ Tournament Endpoints ============

@router.get("/club-tournaments")
async def list_tournaments(
    status_filter: str = "all",
    venue_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search_query: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """Get all tournaments with optional status, venue, date range filters, search, and pagination."""
    return await services.get_all_tournaments(
        db, 
        status_filter=status_filter, 
        venue_id=venue_id, 
        start_date=start_date, 
        end_date=end_date, 
        search_query=search_query,
        page=page, 
        page_size=page_size
    )


@router.post("/club-tournaments", status_code=status.HTTP_201_CREATED)
async def create_tournament(
    data: ClubTournamentCreate,
    password: str,
    db: AsyncSession = Depends(get_db),
):
    """Create a new tournament (admin only)."""
    _verify_admin(password)
    return await services.create_tournament(data, db)


@router.put("/club-tournaments/{tournament_id}")
async def update_tournament(
    tournament_id: int,
    data: ClubTournamentUpdate,
    password: str,
    db: AsyncSession = Depends(get_db),
):
    """Update a tournament (admin only)."""
    _verify_admin(password)
    return await services.update_tournament(tournament_id, data, db)


@router.delete("/club-tournaments/{tournament_id}")
async def delete_tournament(
    tournament_id: int,
    password: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a tournament (admin only)."""
    _verify_admin(password)
    return await services.delete_tournament(tournament_id, db)


# ============ Result Endpoints ============

@router.post("/club-tournaments/{tournament_id}/results", status_code=status.HTTP_201_CREATED)
async def submit_results(
    tournament_id: int,
    data: ClubTournamentResultCreate,
    password: str,
    db: AsyncSession = Depends(get_db),
):
    """Submit results for a tournament (admin only)."""
    _verify_admin(password)
    return await services.submit_results(tournament_id, data, db)


@router.put("/club-tournaments/{tournament_id}/results")
async def update_results(
    tournament_id: int,
    data: ClubTournamentResultUpdate,
    password: str,
    db: AsyncSession = Depends(get_db),
):
    """Update results for a tournament (admin only)."""
    _verify_admin(password)
    return await services.update_results(tournament_id, data, db)


# ============ Bulk Import Endpoint ============

@router.post("/club-tournaments/bulk-import", status_code=status.HTTP_201_CREATED)
async def bulk_import_tournaments(
    data: BulkTournamentImport,
    password: str,
    db: AsyncSession = Depends(get_db),
):
    """Bulk import tournaments with optional results (admin only)."""
    _verify_admin(password)
    return await services.bulk_import_tournaments(data.tournaments, db)
