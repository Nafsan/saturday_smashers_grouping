from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List
from database import get_db
from player import services

router = APIRouter(prefix="/players", tags=["players"])


class PlayerCreate(BaseModel):
    name: str


class PlayerResponse(BaseModel):
    id: int
    name: str


@router.post("", response_model=PlayerResponse, status_code=201)
async def add_player(
    player: PlayerCreate,
    password: str,
    database_session: AsyncSession = Depends(get_db)
):
    """Add a new player"""
    if password != "ss_admin_panel":
        raise HTTPException(status_code=403, detail="Invalid password")
    return await services.create_player(player.name, database_session)


@router.get("", response_model=List[PlayerResponse])
async def get_players(database_session: AsyncSession = Depends(get_db)):
    """Get all players"""
    return await services.get_all_players(database_session)
