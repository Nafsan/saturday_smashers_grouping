"""
SQLAlchemy models for the Club Tournament module.
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class ClubVenue(Base):
    __tablename__ = "club_venues"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False, index=True)
    logo_base64 = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    tournaments = relationship("ClubTournament", back_populates="venue")


class ClubTournament(Base):
    __tablename__ = "club_tournaments"

    id = Column(Integer, primary_key=True, index=True)
    venue_id = Column(Integer, ForeignKey("club_venues.id"), nullable=False)
    category = Column(String(255), nullable=False)
    tournament_datetime = Column(DateTime, nullable=False)
    announcement = Column(Text, nullable=True)
    total_players = Column(Integer, nullable=True, default=0)
    online_link = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    venue = relationship("ClubVenue", back_populates="tournaments")
    result = relationship(
        "ClubTournamentResult",
        back_populates="tournament",
        uselist=False,
        cascade="all, delete-orphan",
    )


class ClubTournamentResult(Base):
    __tablename__ = "club_tournament_results"

    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(
        Integer, ForeignKey("club_tournaments.id"), unique=True, nullable=False
    )
    champion = Column(String(255), nullable=False)
    runner_up = Column(String(255), nullable=False)
    semi_finalist_1 = Column(String(255), nullable=False)
    semi_finalist_2 = Column(String(255), nullable=False)
    quarter_finalist_1 = Column(String(255), nullable=False)
    quarter_finalist_2 = Column(String(255), nullable=False)
    quarter_finalist_3 = Column(String(255), nullable=False)
    quarter_finalist_4 = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    tournament = relationship("ClubTournament", back_populates="result")
