from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from datetime import datetime, date
from typing import List, Optional
import models
import fund_models
import fund_schemas


async def get_or_create_fund_settings(db: AsyncSession) -> fund_models.FundSettings:
    """Get existing fund settings or create default ones"""
    result = await db.execute(select(fund_models.FundSettings))
    settings = result.scalar()
    
    if not settings:
        settings = fund_models.FundSettings(
            default_venue_fee=0.0,
            default_ball_fee=0.0
        )
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    
    return settings


async def update_fund_settings(
    settings_data: fund_schemas.FundSettingsCreate,
    db: AsyncSession
) -> fund_models.FundSettings:
    """Update or create fund settings"""
    result = await db.execute(select(fund_models.FundSettings))
    settings = result.scalar()
    
    if settings:
        settings.default_venue_fee = settings_data.default_venue_fee
        settings.default_ball_fee = settings_data.default_ball_fee
        settings.updated_at = datetime.utcnow()
    else:
        settings = fund_models.FundSettings(
            default_venue_fee=settings_data.default_venue_fee,
            default_ball_fee=settings_data.default_ball_fee
        )
        db.add(settings)
    
    await db.commit()
    await db.refresh(settings)
    return settings


async def seed_initial_player_data(
    seed_data: fund_schemas.SeedInitialDataRequest,
    db: AsyncSession
):
    """Seed initial fund data for players"""
    for player_data in seed_data.players:
        # Get player by name
        player_result = await db.execute(
            select(models.Player).where(models.Player.name == player_data.player_name)
        )
        player = player_result.scalar()
        
        if not player:
            raise HTTPException(
                status_code=404,
                detail=f"Player '{player_data.player_name}' not found"
            )
        
        # Check if fund already exists
        fund_result = await db.execute(
            select(fund_models.PlayerFund).where(
                fund_models.PlayerFund.player_id == player.id
            )
        )
        existing_fund = fund_result.scalar()
        
        if existing_fund:
            # Update existing
            existing_fund.current_balance = player_data.current_balance
            existing_fund.days_played = player_data.days_played
            existing_fund.total_paid = player_data.total_paid
            existing_fund.total_cost = player_data.total_cost
            existing_fund.last_updated = datetime.utcnow()
        else:
            # Create new
            new_fund = fund_models.PlayerFund(
                player_id=player.id,
                current_balance=player_data.current_balance,
                days_played=player_data.days_played,
                total_paid=player_data.total_paid,
                total_cost=player_data.total_cost
            )
            db.add(new_fund)
    
    await db.commit()
    return {"message": "Initial data seeded successfully"}


async def get_all_player_balances(
    search: Optional[str],
    filter_type: Optional[str],
    db: AsyncSession
) -> List[fund_schemas.PlayerFundResponse]:
    """Get all player fund balances with optional search and filter"""
    query = select(fund_models.PlayerFund).options(
        selectinload(fund_models.PlayerFund.player)
    )
    
    result = await db.execute(query)
    funds = result.scalars().all()
    
    # Transform to response format
    response = []
    for fund in funds:
        fund_data = fund_schemas.PlayerFundResponse(
            id=fund.id,
            player_id=fund.player_id,
            player_name=fund.player.name,
            current_balance=fund.current_balance,
            days_played=fund.days_played,
            total_paid=fund.total_paid,
            total_cost=fund.total_cost,
            last_updated=fund.last_updated
        )
        response.append(fund_data)
    
    # Apply search filter
    if search:
        response = [f for f in response if search.lower() in f.player_name.lower()]
    
    # Apply balance filter
    if filter_type == "positive":
        response = [f for f in response if f.current_balance > 0]
    elif filter_type == "negative":
        response = [f for f in response if f.current_balance < 0]
    
    # Sort by player name
    response.sort(key=lambda x: x.player_name)
    
    return response


async def calculate_tournament_costs(
    cost_request: fund_schemas.AddTournamentCostRequest,
    db: AsyncSession
) -> fund_schemas.TournamentCostCalculationResponse:
    """Calculate tournament costs and per-player breakdown"""
    
    # Get tournament by date
    tournament_result = await db.execute(
        select(models.Tournament).where(models.Tournament.date == cost_request.tournament_date)
    )
    tournament = tournament_result.scalar()
    
    if not tournament:
        raise HTTPException(
            status_code=404,
            detail=f"Tournament not found for date {cost_request.tournament_date}"
        )
    
    # Get fund settings for defaults
    settings = await get_or_create_fund_settings(db)
    
    # Determine fees
    venue_fee = cost_request.venue_fee_per_person if not cost_request.use_default_venue_fee else settings.default_venue_fee
    ball_fee = cost_request.ball_fee_per_ball if not cost_request.use_default_ball_fee else settings.default_ball_fee
    
    # Calculate totals
    num_players = len(cost_request.tournament_players)
    num_club_members = len(cost_request.club_members)
    num_regular_members = num_players - num_club_members
    
    total_venue_cost = num_regular_members * venue_fee
    total_ball_cost = cost_request.num_balls_purchased * ball_fee
    total_misc_cost = cost_request.common_misc_cost
    
    # Ball cost per player (split equally among all players)
    ball_cost_per_player = total_ball_cost / num_players if num_players > 0 else 0
    
    # Calculate per-player breakdown
    player_breakdowns = []
    
    for player_name in cost_request.tournament_players:
        is_club_member = player_name in cost_request.club_members
        
        # Venue cost
        player_venue_cost = 0.0 if is_club_member else venue_fee
        
        # Ball cost (split equally)
        player_ball_cost = ball_cost_per_player
        
        # Common misc cost (split equally)
        player_common_misc = cost_request.common_misc_cost / num_players if num_players > 0 else 0
        
        # Player-specific costs
        player_specific_cost = 0.0
        for specific_cost in cost_request.player_specific_costs:
            if player_name in specific_cost.player_names:
                player_specific_cost += specific_cost.cost_amount
        
        total_player_cost = player_venue_cost + player_ball_cost + player_common_misc + player_specific_cost
        
        player_breakdowns.append(fund_schemas.PlayerCostBreakdown(
            player_name=player_name,
            venue_cost=player_venue_cost,
            ball_cost=player_ball_cost,
            common_misc_cost=player_common_misc,
            player_specific_cost=player_specific_cost,
            total_cost=total_player_cost,
            is_club_member=is_club_member
        ))
    
    return fund_schemas.TournamentCostCalculationResponse(
        tournament_id=tournament.id,
        tournament_date=tournament.date,
        total_venue_cost=total_venue_cost,
        total_ball_cost=total_ball_cost,
        total_misc_cost=total_misc_cost,
        total_cost=total_venue_cost + total_ball_cost + total_misc_cost,
        player_breakdowns=player_breakdowns
    )


async def save_tournament_costs_and_update_balances(
    cost_request: fund_schemas.AddTournamentCostRequest,
    db: AsyncSession
):
    """Save tournament costs and update player balances"""
    
    # Calculate costs first
    calculation = await calculate_tournament_costs(cost_request, db)
    
    # Get tournament
    tournament_result = await db.execute(
        select(models.Tournament).where(models.Tournament.date == cost_request.tournament_date)
    )
    tournament = tournament_result.scalar()
    
    # Get fund settings
    settings = await get_or_create_fund_settings(db)
    venue_fee = cost_request.venue_fee_per_person if not cost_request.use_default_venue_fee else settings.default_venue_fee
    ball_fee = cost_request.ball_fee_per_ball if not cost_request.use_default_ball_fee else settings.default_ball_fee
    
    # Save tournament cost record
    tournament_cost = fund_models.TournamentCost(
        tournament_id=tournament.id,
        venue_fee_per_person=venue_fee,
        ball_fee_per_ball=ball_fee,
        num_balls_purchased=cost_request.num_balls_purchased,
        total_venue_cost=calculation.total_venue_cost,
        total_ball_cost=calculation.total_ball_cost,
        common_misc_cost=cost_request.common_misc_cost,
        common_misc_name=cost_request.common_misc_name
    )
    db.add(tournament_cost)
    await db.flush()
    
    # Save player-specific costs
    for specific_cost in cost_request.player_specific_costs:
        for player_name in specific_cost.player_names:
            player_result = await db.execute(
                select(models.Player).where(models.Player.name == player_name)
            )
            player = player_result.scalar()
            
            if player:
                player_specific = fund_models.PlayerSpecificCost(
                    tournament_cost_id=tournament_cost.id,
                    player_id=player.id,
                    cost_amount=specific_cost.cost_amount,
                    cost_name=specific_cost.cost_name
                )
                db.add(player_specific)
    
    # Update tournament attendance
    for player_name in cost_request.tournament_players:
        player_result = await db.execute(
            select(models.Player).where(models.Player.name == player_name)
        )
        player = player_result.scalar()
        
        if player:
            # Check if attendance record already exists (e.g., from unofficial tournament creation)
            existing_attendance_result = await db.execute(
                select(fund_models.TournamentAttendance).where(
                    fund_models.TournamentAttendance.tournament_id == tournament.id,
                    fund_models.TournamentAttendance.player_id == player.id
                )
            )
            existing_attendance = existing_attendance_result.scalar()
            
            if existing_attendance:
                # Update existing attendance record with club member status
                is_club_member = player_name in cost_request.club_members
                existing_attendance.is_club_member = is_club_member
            else:
                # Create new attendance record
                is_club_member = player_name in cost_request.club_members
                attendance = fund_models.TournamentAttendance(
                    tournament_id=tournament.id,
                    player_id=player.id,
                    is_club_member=is_club_member
                )
                db.add(attendance)
    
    # Update player balances
    for breakdown in calculation.player_breakdowns:
        player_result = await db.execute(
            select(models.Player).where(models.Player.name == breakdown.player_name)
        )
        player = player_result.scalar()
        
        if player:
            # Get or create player fund
            fund_result = await db.execute(
                select(fund_models.PlayerFund).where(
                    fund_models.PlayerFund.player_id == player.id
                )
            )
            player_fund = fund_result.scalar()
            
            if not player_fund:
                player_fund = fund_models.PlayerFund(
                    player_id=player.id,
                    current_balance=0.0,
                    days_played=0,
                    total_paid=0.0,
                    total_cost=0.0
                )
                db.add(player_fund)
                await db.flush()
            
            # Update balance and costs
            player_fund.current_balance -= breakdown.total_cost
            player_fund.total_cost += breakdown.total_cost
            player_fund.last_updated = datetime.utcnow()
    
    await db.commit()
    return {"message": "Tournament costs saved and balances updated successfully"}


async def get_player_attendance_stats(db: AsyncSession) -> List[fund_schemas.PlayerAttendanceStats]:
    """Get attendance statistics for all players"""
    query = select(fund_models.TournamentAttendance).options(
        selectinload(fund_models.TournamentAttendance.player)
    )
    
    result = await db.execute(query)
    attendances = result.scalars().all()
    
    # Group by player
    player_stats = {}
    for attendance in attendances:
        player_id = attendance.player_id
        player_name = attendance.player.name
        
        if player_id not in player_stats:
            player_stats[player_id] = {
                'player_id': player_id,
                'player_name': player_name,
                'total_tournaments': 0,
                'as_club_member': 0,
                'as_regular_member': 0
            }
        
        player_stats[player_id]['total_tournaments'] += 1
        if attendance.is_club_member:
            player_stats[player_id]['as_club_member'] += 1
        else:
            player_stats[player_id]['as_regular_member'] += 1
    
    # Convert to response format
    response = [
        fund_schemas.PlayerAttendanceStats(**stats)
        for stats in player_stats.values()
    ]
    
    # Sort by total tournaments descending
    response.sort(key=lambda x: x.total_tournaments, reverse=True)
    
    return response


async def record_player_payment(
    payment_data: fund_schemas.RecordPaymentRequest,
    db: AsyncSession
):
    """Record a payment made by a player and update their balance"""
    # Get player by name
    player_result = await db.execute(
        select(models.Player).where(models.Player.name == payment_data.player_name)
    )
    player = player_result.scalar()
    
    if not player:
        raise HTTPException(
            status_code=404,
            detail=f"Player '{payment_data.player_name}' not found"
        )
    
    # Get or create player fund
    fund_result = await db.execute(
        select(fund_models.PlayerFund).where(
            fund_models.PlayerFund.player_id == player.id
        )
    )
    player_fund = fund_result.scalar()
    
    if not player_fund:
        player_fund = fund_models.PlayerFund(
            player_id=player.id,
            current_balance=0.0,
            days_played=0,
            total_paid=0.0,
            total_cost=0.0
        )
        db.add(player_fund)
        await db.flush()
    
    # Update balance and total paid
    player_fund.current_balance += payment_data.amount
    player_fund.total_paid += payment_data.amount
    player_fund.last_updated = datetime.utcnow()
    
    # Record transaction history
    payment_date = payment_data.payment_date if payment_data.payment_date else datetime.utcnow().date()
    # Convert date to datetime for DB if needed, or keep as date if column allows. 
    # The model has DateTime, so let's convert date to datetime (start of day)
    if isinstance(payment_date, date) and not isinstance(payment_date, datetime):
        payment_datetime = datetime.combine(payment_date, datetime.min.time())
    else:
        payment_datetime = payment_date

    transaction = fund_models.PaymentTransaction(
        player_id=player.id,
        amount=payment_data.amount,
        payment_date=payment_datetime,
        notes=payment_data.notes
    )
    db.add(transaction)
    
    await db.commit()
    
    return {
        "message": f"Payment of ৳{payment_data.amount} recorded successfully for {payment_data.player_name}",
        "new_balance": player_fund.current_balance
    }


async def get_days_played_comparison(db: AsyncSession):
    """Get days played comparison for all players"""
    # Get all player funds with player names
    result = await db.execute(
        select(fund_models.PlayerFund, models.Player.name)
        .join(models.Player, fund_models.PlayerFund.player_id == models.Player.id)
        .order_by(fund_models.PlayerFund.days_played.desc())
    )
    
    player_funds = result.all()
    
    return [
        {
            "player_name": player_name,
            "days_played": player_fund.days_played
        }
        for player_fund, player_name in player_funds
    ]


async def get_tournament_cost_dates(db: AsyncSession) -> List[date]:
    """Get list of dates that have tournament cost data"""
    result = await db.execute(
        select(models.Tournament.date)
        .join(fund_models.TournamentCost, models.Tournament.id == fund_models.TournamentCost.tournament_id)
        .order_by(models.Tournament.date.desc())
    )
    return result.scalars().all()


async def get_tournament_cost_details(
    tournament_date: date,
    db: AsyncSession
) -> fund_schemas.TournamentCostCalculationResponse:
    """Get cost breakdown for a specific tournament date"""
    # Get tournament
    tournament_result = await db.execute(
        select(models.Tournament).where(models.Tournament.date == tournament_date)
    )
    tournament = tournament_result.scalar()
    
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
        
    # Get cost record
    cost_result = await db.execute(
        select(fund_models.TournamentCost).where(
            fund_models.TournamentCost.tournament_id == tournament.id
        )
    )
    cost_record = cost_result.scalar()
    
    if not cost_record:
        raise HTTPException(status_code=404, detail="Cost record not found for this tournament")
        
    # Get attendance (players)
    attendance_result = await db.execute(
        select(fund_models.TournamentAttendance).where(
            fund_models.TournamentAttendance.tournament_id == tournament.id
        ).options(selectinload(fund_models.TournamentAttendance.player))
    )
    attendances = attendance_result.scalars().all()
    
    # Get player specific costs
    specific_costs_result = await db.execute(
        select(fund_models.PlayerSpecificCost).where(
            fund_models.PlayerSpecificCost.tournament_cost_id == cost_record.id
        )
    )
    specific_costs = specific_costs_result.scalars().all()
    
    # Reconstruct breakdown
    num_players = len(attendances)
    ball_cost_per_player = cost_record.total_ball_cost / num_players if num_players > 0 else 0
    misc_cost_per_player = cost_record.common_misc_cost / num_players if num_players > 0 else 0
    
    player_breakdowns = []
    
    for attendance in attendances:
        player = attendance.player
        is_club_member = attendance.is_club_member
        
        # Venue cost
        venue_cost = 0.0 if is_club_member else cost_record.venue_fee_per_person
        
        # Specific costs
        player_specific_total = sum(
            sc.cost_amount for sc in specific_costs if sc.player_id == player.id
        )
        
        total_player_cost = venue_cost + ball_cost_per_player + misc_cost_per_player + player_specific_total
        
        player_breakdowns.append(fund_schemas.PlayerCostBreakdown(
            player_name=player.name,
            venue_cost=venue_cost,
            ball_cost=ball_cost_per_player,
            common_misc_cost=misc_cost_per_player,
            player_specific_cost=player_specific_total,
            total_cost=total_player_cost,
            is_club_member=is_club_member
        ))
        
    return fund_schemas.TournamentCostCalculationResponse(
        tournament_id=tournament.id,
        tournament_date=tournament.date,
        total_venue_cost=cost_record.total_venue_cost,
        total_ball_cost=cost_record.total_ball_cost,
        total_misc_cost=cost_record.common_misc_cost,
        total_cost=cost_record.total_venue_cost + cost_record.total_ball_cost + cost_record.common_misc_cost,
        player_breakdowns=player_breakdowns
    )


async def add_player_misc_cost(
    cost_data: fund_schemas.AddPlayerMiscCostRequest,
    db: AsyncSession
):
    """Add miscellaneous cost for players and update their balances"""
    
    if not cost_data.player_names:
        raise HTTPException(status_code=400, detail="At least one player must be selected")
    
    if cost_data.cost_amount <= 0:
        raise HTTPException(status_code=400, detail="Cost amount must be greater than 0")
    
    updated_balances = []
    
    for player_name in cost_data.player_names:
        # Get player by name
        player_result = await db.execute(
            select(models.Player).where(models.Player.name == player_name)
        )
        player = player_result.scalar()
        
        if not player:
            raise HTTPException(
                status_code=404,
                detail=f"Player '{player_name}' not found"
            )
        
        # Get or create player fund
        fund_result = await db.execute(
            select(fund_models.PlayerFund).where(
                fund_models.PlayerFund.player_id == player.id
            )
        )
        player_fund = fund_result.scalar()
        
        if not player_fund:
            player_fund = fund_models.PlayerFund(
                player_id=player.id,
                current_balance=0.0,
                days_played=0,
                total_paid=0.0,
                total_cost=0.0
            )
            db.add(player_fund)
            await db.flush()
        
        # Deduct cost from balance and increment total cost
        player_fund.current_balance -= cost_data.cost_amount
        player_fund.total_cost += cost_data.cost_amount
        player_fund.last_updated = datetime.utcnow()
        
        updated_balances.append({
            "player_name": player_name,
            "new_balance": player_fund.current_balance,
            "cost_added": cost_data.cost_amount
        })
    
    await db.commit()
    
    return {
        "message": f"Miscellaneous cost of ৳{cost_data.cost_amount} added successfully for {len(cost_data.player_names)} player(s)",
        "description": cost_data.cost_description,
        "updated_balances": updated_balances
    }
