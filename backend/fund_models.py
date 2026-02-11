from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class PlayerFund(Base):
    __tablename__ = "player_funds"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), unique=True, nullable=False)
    current_balance = Column(Float, default=0.0, nullable=False)
    days_played = Column(Integer, default=0, nullable=False)
    total_paid = Column(Float, default=0.0, nullable=False)
    total_cost = Column(Float, default=0.0, nullable=False)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    player = relationship("Player", back_populates="fund")


class TournamentCost(Base):
    __tablename__ = "tournament_costs"

    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(String, ForeignKey("tournaments.id"), unique=True, nullable=False)
    venue_fee_per_person = Column(Float, nullable=False)
    ball_fee_per_ball = Column(Float, nullable=False)
    num_balls_purchased = Column(Integer, default=0, nullable=False)
    total_venue_cost = Column(Float, default=0.0, nullable=False)
    total_ball_cost = Column(Float, default=0.0, nullable=False)
    common_misc_cost = Column(Float, default=0.0, nullable=False)
    common_misc_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    tournament = relationship("Tournament", back_populates="costs")
    player_specific_costs = relationship("PlayerSpecificCost", back_populates="tournament_cost", cascade="all, delete-orphan")


class FundSettings(Base):
    __tablename__ = "fund_settings"

    id = Column(Integer, primary_key=True, index=True)
    default_venue_fee = Column(Float, nullable=False)
    default_ball_fee = Column(Float, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PlayerSpecificCost(Base):
    __tablename__ = "player_specific_costs"

    id = Column(Integer, primary_key=True, index=True)
    tournament_cost_id = Column(Integer, ForeignKey("tournament_costs.id"), nullable=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    cost_amount = Column(Float, nullable=False)
    cost_name = Column(String(255), nullable=True)
    cost_date = Column(DateTime, nullable=True)

    tournament_cost = relationship("TournamentCost", back_populates="player_specific_costs")
    player = relationship("Player")


class TournamentAttendance(Base):
    __tablename__ = "tournament_attendance"

    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(String, ForeignKey("tournaments.id"), nullable=False)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    is_club_member = Column(Boolean, default=False, nullable=False)

    tournament = relationship("Tournament", back_populates="attendance")
    player = relationship("Player")


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    notes = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    player = relationship("Player")
