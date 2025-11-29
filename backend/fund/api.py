from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import date
from database import get_db
from fund import services
import fund_schemas

router = APIRouter(prefix="/fund", tags=["fund"])


# ============ Fund Settings ============
@router.get("/settings", response_model=fund_schemas.FundSettingsResponse)
async def get_fund_settings(db: AsyncSession = Depends(get_db)):
    """Get current fund settings"""
    settings = await services.get_or_create_fund_settings(db)
    return settings


@router.post("/settings", response_model=fund_schemas.FundSettingsResponse)
async def update_fund_settings(
    settings: fund_schemas.FundSettingsCreate,
    password: str,
    db: AsyncSession = Depends(get_db)
):
    """Update fund settings (password protected)"""
    if password != "ss_admin_panel":
        raise HTTPException(status_code=403, detail="Invalid password")
    
    updated_settings = await services.update_fund_settings(settings, db)
    return updated_settings


# ============ Seed Initial Data ============
@router.post("/seed")
async def seed_initial_data(
    seed_data: fund_schemas.SeedInitialDataRequest,
    password: str,
    db: AsyncSession = Depends(get_db)
):
    """Seed initial player fund data (password protected)"""
    if password != "ss_admin_panel":
        raise HTTPException(status_code=403, detail="Invalid password")
    
    return await services.seed_initial_player_data(seed_data, db)


# ============ Player Balances ============
@router.get("/balances", response_model=List[fund_schemas.PlayerFundResponse])
async def get_player_balances(
    search: Optional[str] = Query(None),
    filter: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Get all player fund balances with optional search and filter"""
    return await services.get_all_player_balances(search, filter, db)


# ============ Tournament Costs ============
@router.post("/tournament-costs/calculate", response_model=fund_schemas.TournamentCostCalculationResponse)
async def calculate_tournament_costs(
    cost_request: fund_schemas.AddTournamentCostRequest,
    password: str,
    db: AsyncSession = Depends(get_db)
):
    """Calculate tournament costs without saving (password protected)"""
    if password != "ss_admin_panel":
        raise HTTPException(status_code=403, detail="Invalid password")
    
    return await services.calculate_tournament_costs(cost_request, db)


@router.post("/tournament-costs/save")
async def save_tournament_costs(
    cost_request: fund_schemas.AddTournamentCostRequest,
    password: str,
    db: AsyncSession = Depends(get_db)
):
    """Save tournament costs and update player balances (password protected)"""
    if password != "ss_admin_panel":
        raise HTTPException(status_code=403, detail="Invalid password")
    
    return await services.save_tournament_costs_and_update_balances(cost_request, db)


@router.get("/tournament-costs/dates", response_model=List[date])
async def get_tournament_cost_dates(db: AsyncSession = Depends(get_db)):
    """Get list of dates that have tournament cost data"""
    return await services.get_tournament_cost_dates(db)


@router.get("/tournament-costs/{date_str}", response_model=fund_schemas.TournamentCostCalculationResponse)
async def get_tournament_cost_details(
    date_str: date,
    db: AsyncSession = Depends(get_db)
):
    """Get cost breakdown for a specific tournament date"""
    return await services.get_tournament_cost_details(date_str, db)


# ============ Attendance ============
@router.get("/attendance", response_model=List[fund_schemas.PlayerAttendanceStats])
async def get_player_attendance(db: AsyncSession = Depends(get_db)):
    """Get player attendance statistics"""
    return await services.get_player_attendance_stats(db)


# ============ Payment Recording ============
@router.post("/record-payment")
async def record_payment(
    payment_data: fund_schemas.RecordPaymentRequest,
    password: str,
    db: AsyncSession = Depends(get_db)
):
    """Record a payment made by a player (password protected)"""
    if password != "ss_admin_panel":
        raise HTTPException(status_code=403, detail="Invalid password")
    
    return await services.record_player_payment(payment_data, db)


# ============ Days Played Comparison ============
@router.get("/days-played-comparison")
async def get_days_played_comparison(db: AsyncSession = Depends(get_db)):
    """Get days played comparison for all players with fund records"""
    return await services.get_days_played_comparison(db)
