from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime

# ============ Fund Settings ============
class FundSettingsBase(BaseModel):
    default_venue_fee: float
    default_ball_fee: float

class FundSettingsCreate(FundSettingsBase):
    pass

class FundSettingsResponse(FundSettingsBase):
    id: int
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ Player Fund ============
class PlayerFundBase(BaseModel):
    player_id: int
    current_balance: float
    days_played: int
    total_paid: float
    total_cost: float

class PlayerFundCreate(BaseModel):
    player_name: str
    current_balance: float
    days_played: int
    total_paid: float
    total_cost: float

class PlayerFundResponse(PlayerFundBase):
    id: int
    player_name: str
    last_updated: datetime

    class Config:
        from_attributes = True


# ============ Seed Initial Data ============
class SeedPlayerData(BaseModel):
    player_name: str
    current_balance: float
    days_played: int
    total_paid: float
    total_cost: float

class SeedInitialDataRequest(BaseModel):
    players: List[SeedPlayerData]


# ============ Player Specific Cost ============
class PlayerSpecificCostBase(BaseModel):
    player_id: int
    cost_amount: float
    cost_name: Optional[str] = None

class PlayerSpecificCostCreate(BaseModel):
    player_names: List[str]
    cost_amount: float
    cost_name: Optional[str] = None


# ============ Tournament Cost ============
class TournamentCostBase(BaseModel):
    tournament_id: str
    venue_fee_per_person: float
    ball_fee_per_ball: float
    num_balls_purchased: int
    total_venue_cost: float
    total_ball_cost: float
    common_misc_cost: float
    common_misc_name: Optional[str] = None

class AddTournamentCostRequest(BaseModel):
    tournament_date: date
    use_default_venue_fee: bool
    use_default_ball_fee: bool
    venue_fee_per_person: Optional[float] = None
    ball_fee_per_ball: Optional[float] = None
    tournament_players: List[str]
    club_members: List[str] = []
    num_balls_purchased: int
    common_misc_cost: float = 0.0
    common_misc_name: Optional[str] = None
    player_specific_costs: List[PlayerSpecificCostCreate] = []

class PlayerCostBreakdown(BaseModel):
    player_name: str
    venue_cost: float
    ball_cost: float
    common_misc_cost: float
    player_specific_cost: float
    total_cost: float
    is_club_member: bool

class TournamentCostCalculationResponse(BaseModel):
    tournament_id: str
    tournament_date: date
    total_venue_cost: float
    total_ball_cost: float
    total_misc_cost: float
    total_cost: float
    player_breakdowns: List[PlayerCostBreakdown]

class UpdatePlayerBalancesRequest(BaseModel):
    tournament_id: str
    player_balances: List[PlayerFundCreate]


# ============ Tournament Attendance ============
class TournamentAttendanceResponse(BaseModel):
    tournament_id: str
    tournament_date: date
    player_id: int
    player_name: str
    is_club_member: bool

    class Config:
        from_attributes = True

class PlayerAttendanceStats(BaseModel):
    player_id: int
    player_name: str
    total_tournaments: int
    as_club_member: int
    as_regular_member: int


# ============ Fund Balance Query ============
class FundBalanceQueryParams(BaseModel):
    search: Optional[str] = None
    filter: Optional[str] = None  # 'positive', 'negative', or None for all


# ============ Payment Recording ============
class RecordPaymentRequest(BaseModel):
    player_name: str
    amount: float
    payment_date: Optional[date] = None
    notes: Optional[str] = None


# ============ Player Miscellaneous Cost ============
class AddPlayerMiscCostRequest(BaseModel):
    player_names: List[str]
    cost_amount: float
    cost_description: Optional[str] = None
    cost_date: Optional[date] = None


# ============ Payment History ============
class PaymentTransactionResponse(BaseModel):
    id: int
    player_id: int
    player_name: str
    amount: float
    payment_date: datetime
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PaginatedPaymentHistoryResponse(BaseModel):
    items: List[PaymentTransactionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

