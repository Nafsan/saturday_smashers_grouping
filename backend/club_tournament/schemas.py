"""
Pydantic schemas for the Club Tournament module.
"""

from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime


# ============ Venue Schemas ============

class ClubVenueCreate(BaseModel):
    name: str
    logo_base64: Optional[str] = None


class ClubVenueUpdate(BaseModel):
    name: Optional[str] = None
    logo_base64: Optional[str] = None


class ClubVenueResponse(BaseModel):
    id: int
    name: str
    logo_base64: Optional[str] = None
    created_at: datetime

    class Config:
        orm_mode = True


# ============ Tournament Result Schemas ============

class ClubTournamentResultCreate(BaseModel):
    total_players: int
    champion: str
    runner_up: str
    semi_finalist_1: str
    semi_finalist_2: str
    quarter_finalist_1: Optional[str] = None
    quarter_finalist_2: Optional[str] = None
    quarter_finalist_3: Optional[str] = None
    quarter_finalist_4: Optional[str] = None
    online_link: Optional[str] = None


class ClubTournamentResultUpdate(ClubTournamentResultCreate):
    pass


class ClubTournamentResultResponse(BaseModel):
    id: int
    tournament_id: int
    champion: str
    runner_up: str
    semi_finalist_1: str
    semi_finalist_2: str
    quarter_finalist_1: Optional[str] = None
    quarter_finalist_2: Optional[str] = None
    quarter_finalist_3: Optional[str] = None
    quarter_finalist_4: Optional[str] = None
    created_at: datetime

    class Config:
        orm_mode = True


# ============ Tournament Schemas ============

class ClubTournamentCreate(BaseModel):
    venue_id: int
    category: str
    tournament_datetime: datetime
    announcement: Optional[str] = None
    total_players: Optional[int] = 0
    online_link: Optional[str] = None

    @validator('tournament_datetime')
    def strip_timezone(cls, v):
        """Strip timezone info to avoid asyncpg offset-aware datetime errors."""
        if isinstance(v, datetime) and v.tzinfo is not None:
            return v.replace(tzinfo=None)
        return v


class ClubTournamentUpdate(BaseModel):
    venue_id: Optional[int] = None
    category: Optional[str] = None
    tournament_datetime: Optional[datetime] = None
    announcement: Optional[str] = None
    total_players: Optional[int] = None
    online_link: Optional[str] = None

    @validator('tournament_datetime')
    def strip_timezone(cls, v):
        """Strip timezone info to avoid asyncpg offset-aware datetime errors."""
        if isinstance(v, datetime) and v.tzinfo is not None:
            return v.replace(tzinfo=None)
        return v


class ClubTournamentResponse(BaseModel):
    id: int
    venue_id: int
    category: str
    tournament_datetime: datetime
    announcement: Optional[str] = None
    total_players: Optional[int] = 0
    online_link: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    venue: ClubVenueResponse
    result: Optional[ClubTournamentResultResponse] = None
    status: str  # Derived field: "upcoming" or "past"

    class Config:
        orm_mode = True


# ============ Bulk Import Schemas ============

class BulkTournamentEntry(BaseModel):
    venue_id: int
    category: str
    tournament_datetime: datetime
    announcement: Optional[str] = None
    total_players: Optional[int] = 0
    online_link: Optional[str] = None
    # Result fields (optional, for past tournaments)
    champion: Optional[str] = None
    runner_up: Optional[str] = None
    semi_finalist_1: Optional[str] = None
    semi_finalist_2: Optional[str] = None
    quarter_finalist_1: Optional[str] = None
    quarter_finalist_2: Optional[str] = None
    quarter_finalist_3: Optional[str] = None
    quarter_finalist_4: Optional[str] = None

    @validator('tournament_datetime')
    def strip_timezone(cls, v):
        if isinstance(v, datetime) and v.tzinfo is not None:
            return v.replace(tzinfo=None)
        return v


class BulkTournamentImport(BaseModel):
    tournaments: List[BulkTournamentEntry]
