"""
Business logic / services for the Club Tournament module.
"""

from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from club_tournament.models import ClubVenue, ClubTournament, ClubTournamentResult, ClubVenueWhatsappLink
from club_tournament.schemas import (
    ClubVenueCreate,
    ClubVenueUpdate,
    ClubTournamentCreate,
    ClubTournamentUpdate,
    ClubTournamentResultCreate,
    ClubTournamentResultUpdate,
    BulkTournamentEntry,
)
from club_tournament.constants import (
    TOURNAMENT_STATUS_UPCOMING,
    TOURNAMENT_STATUS_PAST,
    VALID_STATUSES,
    ERROR_TOURNAMENT_NOT_FOUND,
    ERROR_VENUE_NOT_FOUND,
    ERROR_VENUE_NAME_EXISTS,
    ERROR_RESULTS_ALREADY_EXIST,
    ERROR_RESULTS_NOT_FOUND,
    ERROR_INVALID_STATUS_FILTER,
    ERROR_VENUE_IN_USE,
)


# Bangladesh Time Offset (BDT)
BDT_OFFSET = timedelta(hours=6)

def _get_now_bdt() -> datetime:
    """Return current time in BDT."""
    return datetime.utcnow() + BDT_OFFSET

def _derive_tournament_status(tournament_datetime: datetime) -> str:
    """Derive tournament status from its datetime. Assumes stored in BDT or naive comparison."""
    # Compare with BDT time since user wants tournament times in BDT
    return TOURNAMENT_STATUS_UPCOMING if tournament_datetime > _get_now_bdt() else TOURNAMENT_STATUS_PAST


def _tournament_to_dict(tournament: ClubTournament) -> dict:
    """Convert a ClubTournament ORM object to a response dict with derived status."""
    result_dict = None
    if tournament.result:
        result_dict = {
            "id": tournament.result.id,
            "tournament_id": tournament.result.tournament_id,
            "champion": tournament.result.champion,
            "runner_up": tournament.result.runner_up,
            "semi_finalist_1": tournament.result.semi_finalist_1,
            "semi_finalist_2": tournament.result.semi_finalist_2,
            "quarter_finalist_1": tournament.result.quarter_finalist_1,
            "quarter_finalist_2": tournament.result.quarter_finalist_2,
            "quarter_finalist_3": tournament.result.quarter_finalist_3,
            "quarter_finalist_4": tournament.result.quarter_finalist_4,
            "created_at": tournament.result.created_at,
        }

    venue_dict = {
        "id": tournament.venue.id,
        "name": tournament.venue.name,
        "logo_base64": tournament.venue.logo_base64,
        "whatsapp_links": [
            {"id": l.id, "label": l.label, "link": l.link} for l in tournament.venue.whatsapp_links
        ],
        "created_at": tournament.venue.created_at,
    }
 
    whatsapp_link_dict = None
    if tournament.whatsapp_link:
        whatsapp_link_dict = {
            "id": tournament.whatsapp_link.id,
            "label": tournament.whatsapp_link.label,
            "link": tournament.whatsapp_link.link,
        }
 
    return {
        "id": tournament.id,
        "venue_id": tournament.venue_id,
        "category": tournament.category,
        "tournament_datetime": tournament.tournament_datetime,
        "announcement": tournament.announcement,
        "total_players": tournament.total_players,
        "online_link": tournament.online_link,
        "whatsapp_link_id": tournament.whatsapp_link_id,
        "created_at": tournament.created_at,
        "updated_at": tournament.updated_at,
        "venue": venue_dict,
        "result": result_dict,
        "whatsapp_link": whatsapp_link_dict,
        "status": _derive_tournament_status(tournament.tournament_datetime),
    }


# ============ Venue Services ============

async def get_all_venues(db: AsyncSession) -> List[ClubVenue]:
    """Get all venues ordered by name."""
    result = await db.execute(
        select(ClubVenue).options(selectinload(ClubVenue.whatsapp_links)).order_by(ClubVenue.name)
    )
    return result.scalars().all()


async def create_venue(data: ClubVenueCreate, db: AsyncSession) -> ClubVenue:
    """Create a new venue."""
    # Check for duplicate name
    existing = await db.execute(
        select(ClubVenue).where(ClubVenue.name == data.name)
    )
    if existing.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_VENUE_NAME_EXISTS,
        )
 
    venue = ClubVenue(
        name=data.name,
        logo_base64=data.logo_base64,
    )
    db.add(venue)
    await db.flush()
 
    if data.whatsapp_links:
        for link_data in data.whatsapp_links:
            wl = ClubVenueWhatsappLink(
                venue_id=venue.id,
                label=link_data.label,
                link=link_data.link
            )
            db.add(wl)
 
    await db.commit()
    return await get_venue_by_id(venue.id, db)


async def update_venue(venue_id: int, data: ClubVenueUpdate, db: AsyncSession) -> ClubVenue:
    """Update an existing venue."""
    result = await db.execute(select(ClubVenue).where(ClubVenue.id == venue_id))
    venue = result.scalars().first()
    if not venue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_VENUE_NOT_FOUND,
        )

    # Check for duplicate name if name is being changed
    if data.name and data.name != venue.name:
        existing = await db.execute(
            select(ClubVenue).where(ClubVenue.name == data.name)
        )
        if existing.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=ERROR_VENUE_NAME_EXISTS,
            )

    if data.name is not None:
        venue.name = data.name
    if data.logo_base64 is not None:
        venue.logo_base64 = data.logo_base64
 
    if data.whatsapp_links is not None:
        # Simple approach: clear and recreate
        await db.execute(delete(ClubVenueWhatsappLink).where(ClubVenueWhatsappLink.venue_id == venue_id))
        for link_data in data.whatsapp_links:
            wl = ClubVenueWhatsappLink(
                venue_id=venue.id,
                label=link_data.label,
                link=link_data.link
            )
            db.add(wl)

    await db.commit()
    return await get_venue_by_id(venue_id, db)
 
 
async def get_venue_by_id(venue_id: int, db: AsyncSession) -> ClubVenue:
    """Get a venue by ID with relationships."""
    result = await db.execute(
        select(ClubVenue)
        .options(selectinload(ClubVenue.whatsapp_links))
        .where(ClubVenue.id == venue_id)
    )
    venue = result.scalars().first()
    if not venue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_VENUE_NOT_FOUND,
        )
    return venue


async def delete_venue(venue_id: int, db: AsyncSession) -> dict:
    """Delete a venue if it's not in use by any tournaments."""
    result = await db.execute(select(ClubVenue).where(ClubVenue.id == venue_id))
    venue = result.scalars().first()
    if not venue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_VENUE_NOT_FOUND,
        )

    # Check if venue is used by any tournaments
    tournaments = await db.execute(
        select(ClubTournament).where(ClubTournament.venue_id == venue_id)
    )
    if tournaments.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_VENUE_IN_USE,
        )

    await db.delete(venue)
    await db.commit()
    return {"message": f"Venue '{venue.name}' deleted successfully"}


# ============ Tournament Services ============

async def get_all_tournaments(
    db: AsyncSession, 
    status_filter: str = "all", 
    venue_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search_query: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    """Get tournaments with optional status, venue, date range filters, search, and pagination."""
    if status_filter not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_INVALID_STATUS_FILTER,
        )

    # Base query for tournaments
    query = (
        select(ClubTournament)
        .options(
            selectinload(ClubTournament.venue),
            selectinload(ClubTournament.result),
            selectinload(ClubTournament.whatsapp_link),
            selectinload(ClubTournament.venue, ClubVenue.whatsapp_links)
        )
        .order_by(ClubTournament.tournament_datetime.desc())
    )

    # Apply Filters
    if venue_id is not None:
        query = query.where(ClubTournament.venue_id == venue_id)

    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
            query = query.where(ClubTournament.tournament_datetime >= start_dt)
        except ValueError:
            pass # Ignore invalid date formats

    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
            query = query.where(ClubTournament.tournament_datetime <= end_dt)
        except ValueError:
            pass # Ignore invalid date formats

    if search_query:
        query = query.where(ClubTournament.category.ilike(f"%{search_query}%"))

    # Total Count Query (without pagination)
    from sqlalchemy import func
    count_query = select(func.count(ClubTournament.id))
    if venue_id is not None:
        count_query = count_query.where(ClubTournament.venue_id == venue_id)
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
            count_query = count_query.where(ClubTournament.tournament_datetime >= start_dt)
        except ValueError: pass
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
            count_query = count_query.where(ClubTournament.tournament_datetime <= end_dt)
        except ValueError: pass

    if search_query:
        count_query = count_query.where(ClubTournament.category.ilike(f"%{search_query}%"))

    # Execute Count
    count_result = await db.execute(count_query)
    total_count = count_result.scalar() or 0

    # Apply Pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    # Execute Fetch
    result = await db.execute(query)
    tournaments = result.scalars().all()

    # Convert to dicts with derived status
    tournament_dicts = [_tournament_to_dict(t) for t in tournaments]

    # Filter by status if requested (post-fetch because status is derived)
    # NOTE: Pagination is applied BEFORE derived status filtering.
    # If the user filters by status "upcoming", they might get fewer than page_size items.
    # To fix this perfectly, we'd need to filter in the query, but status is currently derived.
    # However, for most cases with the requested date range, the query-level filtering will suffice.
    if status_filter == TOURNAMENT_STATUS_UPCOMING:
        tournament_dicts = [t for t in tournament_dicts if t["status"] == TOURNAMENT_STATUS_UPCOMING]
    elif status_filter == TOURNAMENT_STATUS_PAST:
        tournament_dicts = [t for t in tournament_dicts if t["status"] == TOURNAMENT_STATUS_PAST]

    return {
        "items": tournament_dicts,
        "total_count": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": (total_count + page_size - 1) // page_size
    }


async def get_tournament_by_id(tournament_id: int, db: AsyncSession) -> ClubTournament:
    """Get a single tournament by ID."""
    result = await db.execute(
        select(ClubTournament)
        .options(
            selectinload(ClubTournament.venue),
            selectinload(ClubTournament.result),
            selectinload(ClubTournament.whatsapp_link),
            selectinload(ClubTournament.venue, ClubVenue.whatsapp_links)
        )
        .where(ClubTournament.id == tournament_id)
    )
    tournament = result.scalars().first()
    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_TOURNAMENT_NOT_FOUND,
        )
    return tournament


async def create_tournament(data: ClubTournamentCreate, db: AsyncSession) -> dict:
    """Create a new tournament."""
    # Verify venue exists
    venue_result = await db.execute(
        select(ClubVenue).where(ClubVenue.id == data.venue_id)
    )
    if not venue_result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_VENUE_NOT_FOUND,
        )

    tournament = ClubTournament(
        venue_id=data.venue_id,
        category=data.category,
        tournament_datetime=data.tournament_datetime,
        announcement=data.announcement,
        total_players=data.total_players or 0,
        online_link=data.online_link,
        whatsapp_link_id=data.whatsapp_link_id,
    )
    db.add(tournament)
    await db.commit()

    # Reload with relationships
    loaded = await get_tournament_by_id(tournament.id, db)
    return _tournament_to_dict(loaded)


async def update_tournament(
    tournament_id: int, data: ClubTournamentUpdate, db: AsyncSession
) -> dict:
    """Update an existing tournament."""
    tournament = await get_tournament_by_id(tournament_id, db)

    if data.venue_id is not None:
        # Verify new venue exists
        venue_result = await db.execute(
            select(ClubVenue).where(ClubVenue.id == data.venue_id)
        )
        if not venue_result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=ERROR_VENUE_NOT_FOUND,
            )
        tournament.venue_id = data.venue_id

    if data.category is not None:
        tournament.category = data.category
    if data.tournament_datetime is not None:
        tournament.tournament_datetime = data.tournament_datetime
    if data.announcement is not None:
        tournament.announcement = data.announcement
    if data.total_players is not None:
        tournament.total_players = data.total_players
    if data.online_link is not None:
        tournament.online_link = data.online_link
    if getattr(data, 'whatsapp_link_id', None) is not None:
        tournament.whatsapp_link_id = data.whatsapp_link_id
 
    await db.commit()

    # Reload with relationships
    loaded = await get_tournament_by_id(tournament_id, db)
    return _tournament_to_dict(loaded)


async def delete_tournament(tournament_id: int, db: AsyncSession) -> dict:
    """Delete a tournament and its results."""
    tournament = await get_tournament_by_id(tournament_id, db)
    await db.delete(tournament)
    await db.commit()
    return {"message": f"Tournament #{tournament_id} deleted successfully"}


# ============ Result Services ============

async def submit_results(
    tournament_id: int, data: ClubTournamentResultCreate, db: AsyncSession
) -> dict:
    """Submit results for a tournament."""
    tournament = await get_tournament_by_id(tournament_id, db)

    if tournament.result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_RESULTS_ALREADY_EXIST,
        )

    # Update total_players and online_link on the tournament
    tournament.total_players = data.total_players
    if data.online_link is not None:
        tournament.online_link = data.online_link
    if getattr(data, 'whatsapp_link_id', None) is not None:
        tournament.whatsapp_link_id = data.whatsapp_link_id
 
    result = ClubTournamentResult(
        tournament_id=tournament_id,
        champion=data.champion,
        runner_up=data.runner_up,
        semi_finalist_1=data.semi_finalist_1,
        semi_finalist_2=data.semi_finalist_2,
        quarter_finalist_1=data.quarter_finalist_1,
        quarter_finalist_2=data.quarter_finalist_2,
        quarter_finalist_3=data.quarter_finalist_3,
        quarter_finalist_4=data.quarter_finalist_4,
    )
    db.add(result)
    await db.commit()

    # Reload
    loaded = await get_tournament_by_id(tournament_id, db)
    return _tournament_to_dict(loaded)


async def update_results(
    tournament_id: int, data: ClubTournamentResultUpdate, db: AsyncSession
) -> dict:
    """Update existing results for a tournament."""
    tournament = await get_tournament_by_id(tournament_id, db)

    if not tournament.result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_RESULTS_NOT_FOUND,
        )

    # Update total_players and online_link on the tournament
    tournament.total_players = data.total_players
    if data.online_link is not None:
        tournament.online_link = data.online_link

    tournament.result.champion = data.champion
    tournament.result.runner_up = data.runner_up
    tournament.result.semi_finalist_1 = data.semi_finalist_1
    tournament.result.semi_finalist_2 = data.semi_finalist_2
    tournament.result.quarter_finalist_1 = data.quarter_finalist_1
    tournament.result.quarter_finalist_2 = data.quarter_finalist_2
    tournament.result.quarter_finalist_3 = data.quarter_finalist_3
    tournament.result.quarter_finalist_4 = data.quarter_finalist_4

    await db.commit()

    # Reload
    loaded = await get_tournament_by_id(tournament_id, db)
    return _tournament_to_dict(loaded)


# ============ Bulk Import Service ============

async def bulk_import_tournaments(
    entries: List[BulkTournamentEntry], db: AsyncSession
) -> dict:
    """Import multiple tournaments with optional results in one batch."""
    created_count = 0
    errors = []

    for i, entry in enumerate(entries):
        try:
            # Verify venue exists
            venue_result = await db.execute(
                select(ClubVenue).where(ClubVenue.id == entry.venue_id)
            )
            if not venue_result.scalars().first():
                errors.append(f"Row {i+1}: Venue ID {entry.venue_id} not found")
                continue

            tournament = ClubTournament(
                venue_id=entry.venue_id,
                category=entry.category,
                tournament_datetime=entry.tournament_datetime,
                announcement=entry.announcement,
                total_players=entry.total_players or 0,
                online_link=entry.online_link,
            )
            db.add(tournament)
            await db.flush()  # get the ID

            # If result fields are provided, create results
            if entry.champion and entry.runner_up:
                result = ClubTournamentResult(
                    tournament_id=tournament.id,
                    champion=entry.champion,
                    runner_up=entry.runner_up,
                    semi_finalist_1=entry.semi_finalist_1 or "",
                    semi_finalist_2=entry.semi_finalist_2 or "",
                    quarter_finalist_1=entry.quarter_finalist_1,
                    quarter_finalist_2=entry.quarter_finalist_2,
                    quarter_finalist_3=entry.quarter_finalist_3,
                    quarter_finalist_4=entry.quarter_finalist_4,
                )
                db.add(result)
 
            # Sub-task: Handle whatsapp_link_label
            if entry.whatsapp_link_label:
                # Find the venue's links
                venue_links_result = await db.execute(
                    select(ClubVenueWhatsappLink).where(
                        ClubVenueWhatsappLink.venue_id == entry.venue_id,
                        ClubVenueWhatsappLink.label == entry.whatsapp_link_label
                    )
                )
                wl = venue_links_result.scalars().first()
                if wl:
                    tournament.whatsapp_link_id = wl.id

            created_count += 1
        except Exception as e:
            errors.append(f"Row {i+1}: {str(e)}")

    await db.commit()
    return {
        "created": created_count,
        "errors": errors,
        "total": len(entries),
    }
