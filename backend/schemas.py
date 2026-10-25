from pydantic import BaseModel, Field, validator
from urllib.parse import urlparse, parse_qs
from typing import List, Optional
from datetime import date

class PlayerBase(BaseModel):
    name: str

class PlayerCreate(PlayerBase):
    pass

class Player(PlayerBase):
    id: int
    is_guest: bool

    class Config:
        orm_mode = True

class RankGroupBase(BaseModel):
    rank: int
    rating: int
    players: List[str] # List of player names

class RankGroupCreate(RankGroupBase):
    pass

class RankGroup(RankGroupBase):
    id: int
    tournament_id: str

    class Config:
        orm_mode = True

class TournamentBase(BaseModel):
    id: str
    date: date
    playlist_url: Optional[str] = None
    embed_url: Optional[str] = None
    is_official: Optional[bool] = True

class TournamentCreate(TournamentBase):
    ranks: List[RankGroupCreate]

class Tournament(TournamentBase):
    description: Optional[str] = None
    ranks: List[RankGroup]

    class Config:
        orm_mode = True


class CreateUnofficialTournamentRequest(BaseModel):
    """Request schema for creating unofficial tournament"""
    date: date
    tournament_players: List[str]


class UnofficialTournamentDetailsUpdate(BaseModel):
    playlist_url: Optional[str] = Field(default=None, max_length=500)
    description: Optional[str] = None

    @validator('playlist_url')
    def validate_playlist_url(cls, value):
        if not value or not value.strip():
            return None
        value = value.strip()
        parsed = urlparse(value)
        if (
            parsed.scheme not in ('http', 'https')
            or parsed.hostname not in ('youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be')
            or not parse_qs(parsed.query).get('list', [''])[0].strip()
        ):
            raise ValueError('Enter a YouTube playlist URL containing a list ID.')
        return value

    class Config:
        extra = 'forbid'
