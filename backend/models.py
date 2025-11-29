from sqlalchemy import Column, Integer, String, Date, ForeignKey, Table, Text
from sqlalchemy.orm import relationship
from database import Base

# Association Table
rank_group_players = Table(
    'rank_group_players',
    Base.metadata,
    Column('rank_group_id', Integer, ForeignKey('rank_groups.id')),
    Column('player_id', Integer, ForeignKey('players.id'))
)

class Tournament(Base):
    __tablename__ = "tournaments"

    id = Column(String, primary_key=True, index=True)
    date = Column(Date, unique=True, nullable=False)
    playlist_url = Column(String(500), nullable=True)
    embed_url = Column(Text, nullable=True)

    rank_groups = relationship("RankGroup", back_populates="tournament", cascade="all, delete-orphan")
    costs = relationship("TournamentCost", back_populates="tournament", uselist=False, cascade="all, delete-orphan")
    attendance = relationship("TournamentAttendance", back_populates="tournament", cascade="all, delete-orphan")

class RankGroup(Base):
    __tablename__ = "rank_groups"

    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(String, ForeignKey("tournaments.id"))
    rank = Column(Integer, nullable=False)
    rating = Column(Integer, nullable=False)

    tournament = relationship("Tournament", back_populates="rank_groups")
    players = relationship("Player", secondary=rank_group_players, back_populates="rank_groups")

class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)

    rank_groups = relationship("RankGroup", secondary=rank_group_players, back_populates="players")
    fund = relationship("PlayerFund", back_populates="player", uselist=False, cascade="all, delete-orphan")

# Import fund models to ensure they're registered with Base.metadata
from fund_models import PlayerFund, TournamentCost, FundSettings, PlayerSpecificCost, TournamentAttendance
