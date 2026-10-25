from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, validator
from typing import List, Optional
from database import get_db, ADMIN_PASSWORD
from player import services

router = APIRouter(prefix="/players", tags=["players"])


class PlayerCreate(BaseModel):
    name: str


class PlayerUpdate(BaseModel):
    name: Optional[str] = None
    is_guest: Optional[bool] = None

    @validator('name')
    def validate_name(cls, value):
        if value is None or not value.strip():
            raise ValueError('Player name cannot be empty')
        return value.strip()

    @validator('is_guest')
    def validate_guest_status(cls, value):
        if value is None:
            raise ValueError('Guest status cannot be null')
        return value

    class Config:
        extra = 'forbid'


class PlayerResponse(BaseModel):
    id: int
    name: str
    is_guest: bool


@router.post("", response_model=PlayerResponse, status_code=201)
async def add_player(
    player: PlayerCreate,
    password: str,
    database_session: AsyncSession = Depends(get_db)
):
    """Add a new player"""
    if password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Invalid password")
    return await services.create_player(player.name, database_session)


@router.put("/{player_id}", response_model=PlayerResponse)
async def update_player(
    player_id: int,
    player_update: PlayerUpdate,
    password: str,
    database_session: AsyncSession = Depends(get_db)
):
    """Update a player's name and/or guest status while retaining their ID."""
    if password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Invalid password")
    return await services.update_player(
        player_id, database_session, name=player_update.name, is_guest=player_update.is_guest
    )


@router.get("", response_model=List[PlayerResponse])
async def get_players(database_session: AsyncSession = Depends(get_db)):
    """Get all players"""
    return await services.get_all_players(database_session)


@router.get("/{player_id}/statistics")
async def get_player_statistics(
    player_id: int,
    database_session: AsyncSession = Depends(get_db)
):
    """Get tournament statistics for a specific player"""
    return await services.get_player_statistics(player_id, database_session)

@router.get("/{player_id}/insights")
async def get_player_insights(
    player_id: int,
    database_session: AsyncSession = Depends(get_db)
):
    """Generate AI-powered insights for a player"""
    return await services.generate_player_insight(player_id, database_session)

@router.get("/trophy-leaderboard")
async def get_trophy_leaderboard(
    database_session: AsyncSession = Depends(get_db)
):
    """Get players with their trophy counts (rating 1)"""
    return await services.get_trophy_leaderboard(database_session)
