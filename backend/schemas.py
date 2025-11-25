from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class PlayerBase(BaseModel):
    name: str

class PlayerCreate(PlayerBase):
    pass

class Player(PlayerBase):
    id: int

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

class TournamentCreate(TournamentBase):
    ranks: List[RankGroupCreate]

class Tournament(TournamentBase):
    ranks: List[RankGroup]

    class Config:
        orm_mode = True
