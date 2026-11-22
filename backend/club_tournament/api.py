"""
API routes for the Club Tournament module.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from database import get_db
from admin_auth import require_admin
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
from club_tournament.cache import club_cache

router = APIRouter(tags=["club-tournaments"])


# ============ Venue Endpoints ============

@router.get("/club-venues", response_model=List[ClubVenueResponse])
async def list_venues(db: AsyncSession = Depends(get_db)):
    """Get all venues."""
    cache_key = "venues_list"
    cached = club_cache.get(cache_key)
    if cached:
        return cached
        
    result = await services.get_all_venues(db)
    club_cache.set(cache_key, result)
    return result


@router.post("/club-venues", response_model=ClubVenueResponse, status_code=status.HTTP_201_CREATED)
async def create_venue(
    data: ClubVenueCreate,
    admin = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new venue (admin only)."""
    result = await services.create_venue(data, db)
    club_cache.clear()
    return result


@router.put("/club-venues/{venue_id}", response_model=ClubVenueResponse)
async def update_venue(
    venue_id: int,
    data: ClubVenueUpdate,
    admin = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a venue (admin only)."""
    result = await services.update_venue(venue_id, data, db)
    club_cache.clear()
    return result


@router.delete("/club-venues/{venue_id}")
async def delete_venue(
    venue_id: int,
    admin = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a venue (admin only)."""
    result = await services.delete_venue(venue_id, db)
    club_cache.clear()
    return result


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
    cache_key = f"tournaments_{status_filter}_{venue_id}_{start_date}_{end_date}_{search_query}_{page}_{page_size}"
    cached = club_cache.get(cache_key)
    if cached:
        return cached
        
    result = await services.get_all_tournaments(
        db, 
        status_filter=status_filter, 
        venue_id=venue_id, 
        start_date=start_date, 
        end_date=end_date, 
        search_query=search_query,
        page=page, 
        page_size=page_size
    )
    club_cache.set(cache_key, result)
    return result


@router.post("/club-tournaments", status_code=status.HTTP_201_CREATED)
async def create_tournament(
    data: ClubTournamentCreate,
    admin = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new tournament (admin only)."""
    result = await services.create_tournament(data, db)
    club_cache.clear()
    return result


@router.put("/club-tournaments/{tournament_id}")
async def update_tournament(
    tournament_id: int,
    data: ClubTournamentUpdate,
    admin = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a tournament (admin only)."""
    result = await services.update_tournament(tournament_id, data, db)
    club_cache.clear()
    return result


@router.delete("/club-tournaments/{tournament_id}")
async def delete_tournament(
    tournament_id: int,
    admin = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a tournament (admin only)."""
    result = await services.delete_tournament(tournament_id, db)
    club_cache.clear()
    return result


# ============ Result Endpoints ============

@router.post("/club-tournaments/{tournament_id}/results", status_code=status.HTTP_201_CREATED)
async def submit_results(
    tournament_id: int,
    data: ClubTournamentResultCreate,
    admin = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Submit results for a tournament (admin only)."""
    result = await services.submit_results(tournament_id, data, db)
    club_cache.clear()
    return result


@router.put("/club-tournaments/{tournament_id}/results")
async def update_results(
    tournament_id: int,
    data: ClubTournamentResultUpdate,
    admin = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update results for a tournament (admin only)."""
    result = await services.update_results(tournament_id, data, db)
    club_cache.clear()
    return result


# ============ Bulk Import Endpoint ============

@router.post("/club-tournaments/bulk-import", status_code=status.HTTP_201_CREATED)
async def bulk_import_tournaments(
    data: BulkTournamentImport,
    admin = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Bulk import tournaments with optional results (admin only)."""
    result = await services.bulk_import_tournaments(data.tournaments, db)
    club_cache.clear()
    return result
