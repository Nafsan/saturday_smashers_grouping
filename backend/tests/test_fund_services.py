"""Accounting invariants: cost sharing, payments, reversals, and reporting."""
from datetime import date, datetime
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

import models
import fund_models as fm
import fund_schemas as fs
from fund import services

pytestmark = pytest.mark.unit
DAY = date(2026, 10, 24)


@pytest.fixture
def fund(player):
    return fm.PlayerFund(id=1, player=player, player_id=1, current_balance=200,
                         total_paid=500, total_cost=300, days_played=4,
                         last_updated=datetime(2026, 10, 24))


@pytest.fixture
def cost_request():
    return fs.AddTournamentCostRequest(
        tournament_date=DAY, use_default_venue_fee=True, use_default_ball_fee=True,
        tournament_players=["Alice", "Bob"], club_members=["Alice"],
        num_balls_purchased=3, common_misc_cost=40,
    )


@pytest.fixture
def settings():
    return fm.FundSettings(id=1, default_venue_fee=100, default_ball_fee=20)


@pytest.mark.parametrize("exists", [True, False])
async def test_get_or_create_settings(exists, settings, db_session, result_factory):
    db_session.execute.return_value = result_factory(settings if exists else None)
    result = await services.get_or_create_fund_settings(db_session)
    if exists:
        assert result is settings
        db_session.commit.assert_not_awaited()
    else:
        assert result.default_venue_fee == result.default_ball_fee == 0
        db_session.add.assert_called_once_with(result)
        db_session.commit.assert_awaited_once()


@pytest.mark.parametrize("exists", [True, False])
async def test_update_settings(exists, settings, db_session, result_factory):
    db_session.execute.return_value = result_factory(settings if exists else None)
    result = await services.update_fund_settings(fs.FundSettingsCreate(default_venue_fee=150, default_ball_fee=30), db_session)
    assert (result.default_venue_fee, result.default_ball_fee) == (150, 30)
    db_session.commit.assert_awaited_once()


@pytest.mark.parametrize("next_date", [DAY, None])
async def test_next_tournament_date_can_be_set_or_cleared(next_date, settings, db_session, monkeypatch):
    monkeypatch.setattr(services, "get_or_create_fund_settings", AsyncMock(return_value=settings))
    assert (await services.update_next_tournament_date(next_date, db_session)).next_tournament_date == next_date
    db_session.commit.assert_awaited_once()


@pytest.mark.parametrize("exists", [True, False])
async def test_seed_updates_or_creates_fund(exists, player, fund, db_session, result_factory):
    db_session.execute.side_effect = [result_factory(player), result_factory(fund if exists else None)]
    request = fs.SeedInitialDataRequest(players=[fs.SeedPlayerData(player_name="Alice", current_balance=70, days_played=2, total_paid=100, total_cost=30)])
    await services.seed_initial_player_data(request, db_session)
    updated = fund if exists else db_session.add.call_args.args[0]
    assert (updated.current_balance, updated.total_paid, updated.total_cost, updated.days_played) == (70, 100, 30, 2)
    db_session.commit.assert_awaited_once()


async def test_seed_missing_player_does_not_commit(db_session, result_factory):
    db_session.execute.return_value = result_factory()
    request = fs.SeedInitialDataRequest(players=[fs.SeedPlayerData(player_name="Missing", current_balance=0, days_played=0, total_paid=0, total_cost=0)])
    with pytest.raises(HTTPException) as error:
        await services.seed_initial_player_data(request, db_session)
    assert error.value.status_code == 404
    db_session.commit.assert_not_awaited()


@pytest.mark.parametrize("search,balance_filter,names", [
    (None, None, ["Alice", "Bob", "Charlie"]), ("ALI", None, ["Alice"]),
    (None, "positive", ["Alice"]), (None, "negative", ["Bob"]),
    ("missing", None, []), ("bob", "positive", []),
])
async def test_balances_search_filter_and_sort(search, balance_filter, names, fund, db_session, result_factory):
    bob = fm.PlayerFund(id=2, player_id=2, player=models.Player(id=2, name="Bob", is_guest=True), current_balance=-50, days_played=0, total_paid=0, total_cost=50, last_updated=datetime(2026, 10, 24))
    charlie = fm.PlayerFund(id=3, player_id=3, player=models.Player(id=3, name="Charlie", is_guest=False), current_balance=0, days_played=0, total_paid=0, total_cost=0, last_updated=datetime(2026, 10, 24))
    db_session.execute.return_value = result_factory(rows=[charlie, bob, fund])
    result = await services.get_all_player_balances(search, balance_filter, db_session)
    assert [item.player_name for item in result] == names


@pytest.mark.parametrize("custom", [False, True])
async def test_costs_split_shared_expenses_and_exempt_members_from_venue(custom, cost_request, settings, db_session, result_factory):
    cost_request.use_default_venue_fee = cost_request.use_default_ball_fee = not custom
    cost_request.venue_fee_per_person, cost_request.ball_fee_per_ball = 150, 40
    cost_request.player_specific_costs = [fs.PlayerSpecificCostCreate(player_names=["Alice"], cost_amount=15), fs.PlayerSpecificCostCreate(player_names=["Alice", "Bob"], cost_amount=5)]
    db_session.execute.side_effect = [result_factory(models.Tournament(id="cup", date=DAY)), result_factory(settings)]
    result = await services.calculate_tournament_costs(cost_request, db_session)
    venue, balls = (150, 120) if custom else (100, 60)
    alice, bob = result.player_breakdowns
    assert alice.venue_cost == 0
    assert bob.venue_cost == venue
    assert alice.ball_cost == bob.ball_cost == balls / 2
    assert alice.common_misc_cost == bob.common_misc_cost == 20
    assert alice.player_specific_cost == 20
    assert bob.player_specific_cost == 5
    assert alice.total_cost == balls / 2 + 40
    assert bob.total_cost == venue + balls / 2 + 25
    # Existing response total represents shared expenses; personal extras are separate.
    assert result.total_cost == venue + balls + 40
    db_session.commit.assert_not_awaited()


async def test_costs_empty_roster_has_no_division_by_zero(cost_request, settings, db_session, result_factory):
    cost_request.tournament_players = cost_request.club_members = []
    db_session.execute.side_effect = [result_factory(models.Tournament(id="cup", date=DAY)), result_factory(settings)]
    result = await services.calculate_tournament_costs(cost_request, db_session)
    assert result.player_breakdowns == []
    assert result.total_venue_cost == 0


async def test_costs_missing_tournament(cost_request, db_session, result_factory):
    db_session.execute.return_value = result_factory()
    with pytest.raises(HTTPException) as error:
        await services.calculate_tournament_costs(cost_request, db_session)
    assert error.value.status_code == 404


@pytest.mark.parametrize("exists", [True, False])
async def test_record_payment_credits_balance_and_records_history(exists, player, fund, db_session, result_factory):
    db_session.execute.side_effect = [result_factory(player), result_factory(fund if exists else None)]
    result = await services.record_player_payment(fs.RecordPaymentRequest(player_name="Alice", amount=75, payment_date=DAY, notes="Cash"), db_session)
    updated = fund if exists else next(c.args[0] for c in db_session.add.call_args_list if isinstance(c.args[0], fm.PlayerFund))
    assert updated.current_balance == (275 if exists else 75)
    assert updated.total_paid == (575 if exists else 75)
    assert result["new_balance"] == updated.current_balance
    transaction = next(c.args[0] for c in db_session.add.call_args_list if isinstance(c.args[0], fm.PaymentTransaction))
    assert (transaction.player_id, transaction.amount, transaction.payment_date, transaction.notes) == (1, 75, datetime(2026, 10, 24), "Cash")
    db_session.commit.assert_awaited_once()


async def test_payment_defaults_to_today(player, fund, db_session, result_factory):
    db_session.execute.side_effect = [result_factory(player), result_factory(fund)]
    await services.record_player_payment(fs.RecordPaymentRequest(player_name="Alice", amount=10), db_session)
    transaction = db_session.add.call_args.args[0]
    assert transaction.payment_date.date() == datetime.utcnow().date()


async def test_payment_missing_player(db_session, result_factory):
    db_session.execute.return_value = result_factory()
    with pytest.raises(HTTPException) as error:
        await services.record_player_payment(fs.RecordPaymentRequest(player_name="Missing", amount=10), db_session)
    assert error.value.status_code == 404
    db_session.commit.assert_not_awaited()


@pytest.mark.parametrize("new_amount", [30, 150])
async def test_edit_payment_applies_only_amount_difference(new_amount, player, fund, db_session, result_factory):
    transaction = fm.PaymentTransaction(id=8, player_id=1, amount=100)
    db_session.execute.side_effect = [result_factory(transaction), result_factory(player), result_factory(fund)]
    await services.update_player_payment(8, fs.UpdatePaymentRequest(player_name="Alice", amount=new_amount, payment_date=DAY, notes="Corrected"), db_session)
    assert fund.current_balance == 200 + new_amount - 100
    assert fund.total_paid == 500 + new_amount - 100
    assert fund.total_cost == 300
    assert transaction.amount == new_amount
    assert transaction.notes == "Corrected"
    db_session.commit.assert_awaited_once()


@pytest.mark.parametrize("new_fund_exists", [True, False])
async def test_payment_transfer_reverts_old_player_and_credits_new(new_fund_exists, fund, db_session, result_factory):
    transaction = fm.PaymentTransaction(id=8, player_id=1, amount=100)
    bob = models.Player(id=2, name="Bob")
    bob_fund = fm.PlayerFund(player_id=2, current_balance=20, total_paid=50, total_cost=30)
    db_session.execute.side_effect = [result_factory(transaction), result_factory(bob), result_factory(fund), result_factory(bob_fund if new_fund_exists else None)]
    await services.update_player_payment(8, fs.UpdatePaymentRequest(player_name="Bob", amount=80, payment_date=DAY), db_session)
    assert (fund.current_balance, fund.total_paid) == (100, 400)
    updated = bob_fund if new_fund_exists else db_session.add.call_args.args[0]
    assert updated.current_balance == (100 if new_fund_exists else 80)
    assert updated.total_paid == (130 if new_fund_exists else 80)
    assert transaction.player_id == 2


@pytest.mark.parametrize("transaction_exists,player_exists", [(False, False), (True, False)])
async def test_edit_payment_missing_records(transaction_exists, player_exists, db_session, result_factory):
    db_session.execute.side_effect = [result_factory(fm.PaymentTransaction(player_id=1, amount=10) if transaction_exists else None), result_factory()]
    with pytest.raises(HTTPException) as error:
        await services.update_player_payment(8, fs.UpdatePaymentRequest(player_name="Missing", amount=80, payment_date=DAY), db_session)
    assert error.value.status_code == 404
    db_session.commit.assert_not_awaited()


@pytest.mark.parametrize("fund_exists", [True, False])
async def test_delete_payment_reverses_credit(fund_exists, fund, db_session, result_factory):
    transaction = fm.PaymentTransaction(id=8, player_id=1, amount=75)
    db_session.execute.side_effect = [result_factory(transaction), result_factory(fund if fund_exists else None)]
    await services.delete_player_payment(8, db_session)
    if fund_exists:
        assert (fund.current_balance, fund.total_paid, fund.total_cost) == (125, 425, 300)
    db_session.delete.assert_awaited_once_with(transaction)
    db_session.commit.assert_awaited_once()


async def test_delete_missing_payment(db_session, result_factory):
    db_session.execute.return_value = result_factory()
    with pytest.raises(HTTPException) as error:
        await services.delete_player_payment(8, db_session)
    assert error.value.status_code == 404
    db_session.delete.assert_not_awaited()


@pytest.mark.parametrize("names,amount,status", [([], 50, 400), (["Alice"], 0, 400), (["Alice"], -10, 400), (["Missing"], 50, 404)])
async def test_misc_cost_validation(names, amount, status, db_session, result_factory):
    db_session.execute.return_value = result_factory()
    with pytest.raises(HTTPException) as error:
        await services.add_player_misc_cost(fs.AddPlayerMiscCostRequest(player_names=names, cost_amount=amount), db_session)
    assert error.value.status_code == status
    db_session.commit.assert_not_awaited()


@pytest.mark.parametrize("exists", [True, False])
async def test_misc_cost_debits_balance_and_preserves_attendance(exists, player, fund, db_session, result_factory):
    db_session.execute.side_effect = [result_factory(player), result_factory(fund if exists else None)]
    result = await services.add_player_misc_cost(fs.AddPlayerMiscCostRequest(player_names=["Alice"], cost_amount=25, cost_description="Equipment", cost_date=DAY), db_session)
    updated = fund if exists else next(c.args[0] for c in db_session.add.call_args_list if isinstance(c.args[0], fm.PlayerFund))
    assert updated.current_balance == (175 if exists else -25)
    assert updated.total_cost == (325 if exists else 25)
    assert updated.days_played == (4 if exists else 0)
    cost = next(c.args[0] for c in db_session.add.call_args_list if isinstance(c.args[0], fm.PlayerSpecificCost))
    assert cost.tournament_cost_id is None
    assert cost.cost_date == DAY
    assert result["updated_balances"][0]["cost_added"] == 25


async def test_attendance_stats_group_membership_and_sort(player, db_session, result_factory):
    bob = models.Player(id=2, name="Bob")
    attendances = [fm.TournamentAttendance(player_id=2, player=bob, is_club_member=False), fm.TournamentAttendance(player_id=1, player=player, is_club_member=True), fm.TournamentAttendance(player_id=1, player=player, is_club_member=False)]
    db_session.execute.return_value = result_factory(rows=attendances)
    result = await services.get_player_attendance_stats(db_session)
    assert [r.model_dump() for r in result] == [
        {"player_id": 1, "player_name": "Alice", "total_tournaments": 2, "as_club_member": 1, "as_regular_member": 1},
        {"player_id": 2, "player_name": "Bob", "total_tournaments": 1, "as_club_member": 0, "as_regular_member": 1},
    ]


@pytest.mark.parametrize("player_exists", [True, False])
async def test_payment_history_pagination_and_missing_player(player_exists, player, db_session, result_factory):
    transaction = fm.PaymentTransaction(id=3, player_id=1, player=player if player_exists else None, amount=50, payment_date=datetime(2026, 10, 24))
    db_session.execute.side_effect = [result_factory(21), result_factory(rows=[transaction])]
    result = await services.get_payment_history(2, 20, "ali", db_session)
    assert (result.total, result.total_pages, result.page) == (21, 2, 2)
    assert result.items[0].player_name == ("Alice" if player_exists else "Unknown")
    query = db_session.execute.await_args_list[1].args[0].compile()
    assert 20 in query.params.values()


async def test_misc_cost_history_serializes_orm(db_session, result_factory):
    cost = fm.PlayerSpecificCost(id=9, player_id=1, cost_amount=20, cost_name="Equipment", cost_date=DAY)
    db_session.execute.side_effect = [result_factory(11), result_factory(rows=[cost])]
    result = await services.get_player_misc_costs(1, 2, 10, db_session)
    assert (result.total_pages, result.page) == (2, 2)
    assert result.items[0].cost_amount == 20
    assert result.items[0].cost_date == DAY


async def test_days_played_and_cost_dates(fund, db_session, result_factory):
    db_session.execute.side_effect = [result_factory(rows=[(fund, "Alice")]), result_factory(rows=[DAY])]
    assert await services.get_days_played_comparison(db_session) == [{"player_name": "Alice", "days_played": 4}]
    assert await services.get_tournament_cost_dates(db_session) == [DAY]


@pytest.mark.parametrize("missing", ["tournament", "cost"])
async def test_cost_details_missing_records(missing, db_session, result_factory):
    db_session.execute.side_effect = [result_factory(None if missing == "tournament" else models.Tournament(id="cup")), result_factory()]
    with pytest.raises(HTTPException) as error:
        await services.get_tournament_cost_details(DAY, db_session)
    assert error.value.status_code == 404


async def test_cost_details_reconstructs_player_breakdown(player, db_session, result_factory):
    bob = models.Player(id=2, name="Bob")
    cost = fm.TournamentCost(id=3, venue_fee_per_person=100, total_venue_cost=100, total_ball_cost=60, common_misc_cost=40)
    attendances = [fm.TournamentAttendance(player=player, is_club_member=True), fm.TournamentAttendance(player=bob, is_club_member=False)]
    extras = [fm.PlayerSpecificCost(player_id=1, cost_amount=25), fm.PlayerSpecificCost(player_id=1, cost_amount=5)]
    db_session.execute.side_effect = [result_factory(models.Tournament(id="cup", date=DAY)), result_factory(cost), result_factory(rows=attendances), result_factory(rows=extras)]
    result = await services.get_tournament_cost_details(DAY, db_session)
    assert [p.total_cost for p in result.player_breakdowns] == [80, 150]
    assert result.total_cost == 200


@pytest.mark.parametrize("club_member", [True, False])
async def test_player_tournament_costs_share_expenses(club_member, db_session, result_factory):
    attendance = fm.TournamentAttendance(is_club_member=club_member)
    tournament = models.Tournament(id="cup", date=DAY)
    cost = fm.TournamentCost(id=3, total_ball_cost=60, common_misc_cost=40, venue_fee_per_person=100)
    db_session.execute.side_effect = [result_factory(1), result_factory(rows=[(attendance, tournament, cost)]), result_factory(2), result_factory(15), result_factory(rows=["Equipment", None, "Water"])]
    result = await services.get_player_tournament_costs(1, 1, 10, db_session)
    assert result.items[0].total_cost == (65 if club_member else 165)
    assert result.items[0].description == "Equipment, Water"
    assert result.total_pages == 1


@pytest.fixture
def calculation():
    return fs.TournamentCostCalculationResponse(
        tournament_id="cup", tournament_date=DAY, total_venue_cost=100,
        total_ball_cost=60, total_misc_cost=40, total_cost=200,
        player_breakdowns=[fs.PlayerCostBreakdown(
            player_name="Alice", venue_cost=100, ball_cost=60, common_misc_cost=40,
            player_specific_cost=15, total_cost=215, is_club_member=False,
        )],
    )


@pytest.mark.parametrize("existing", [True, False])
async def test_save_costs_records_attendance_and_debits_balance_once(existing, calculation, cost_request, settings, player, fund, db_session, result_factory, monkeypatch):
    cost_request.tournament_players = ["Alice"]
    cost_request.club_members = []
    cost_request.player_specific_costs = [fs.PlayerSpecificCostCreate(player_names=["Alice"], cost_amount=15, cost_name="Equipment")]
    attendance = fm.TournamentAttendance(player_id=1, tournament_id="cup", is_club_member=True)
    monkeypatch.setattr(services, "calculate_tournament_costs", AsyncMock(return_value=calculation))
    monkeypatch.setattr(services, "get_or_create_fund_settings", AsyncMock(return_value=settings))
    revert = AsyncMock()
    monkeypatch.setattr(services, "delete_tournament_costs_and_revert_balances", revert)
    db_session.execute.side_effect = [
        result_factory(fm.TournamentCost(id=1) if existing else None),
        result_factory(models.Tournament(id="cup", date=DAY)), result_factory(player),
        result_factory(player), result_factory(attendance if existing else None),
        result_factory(player), result_factory(fund if existing else None),
    ]

    async def flush():
        db_session.add.call_args.args[0].id = 9

    db_session.flush.side_effect = flush
    result = await services.save_tournament_costs_and_update_balances(cost_request, db_session)
    assert "saved" in result["message"]
    added = [c.args[0] for c in db_session.add.call_args_list]
    saved_cost = next(obj for obj in added if isinstance(obj, fm.TournamentCost))
    assert (saved_cost.tournament_id, saved_cost.total_ball_cost, saved_cost.total_venue_cost) == ("cup", 60, 100)
    specific = next(obj for obj in added if isinstance(obj, fm.PlayerSpecificCost))
    assert specific.tournament_cost_id == saved_cost.id == 9
    assert specific.cost_amount == 15
    updated = fund if existing else next(obj for obj in added if isinstance(obj, fm.PlayerFund))
    assert updated.current_balance == (200 if existing else 0) - 215
    assert updated.total_cost == (300 if existing else 0) + 215
    # Charging costs must not count the tournament a second time.
    assert updated.days_played == (4 if existing else 0)
    if existing:
        assert attendance.is_club_member is False
        revert.assert_awaited_once_with(DAY, db_session)
    else:
        new_attendance = next(obj for obj in added if isinstance(obj, fm.TournamentAttendance))
        assert new_attendance.is_club_member is False
        revert.assert_not_awaited()
    db_session.commit.assert_awaited_once()


async def test_revert_costs_restores_balance_and_deletes_cost_record(calculation, player, fund, db_session, result_factory, monkeypatch):
    monkeypatch.setattr(services, "get_tournament_cost_details", AsyncMock(return_value=calculation))
    db_session.execute.side_effect = [result_factory(player), result_factory(fund), result_factory(models.Tournament(id="cup")), result_factory()]
    await services.delete_tournament_costs_and_revert_balances(DAY, db_session)
    assert (fund.current_balance, fund.total_cost, fund.total_paid, fund.days_played) == (415, 85, 500, 4)
    query, params = db_session.execute.await_args.args
    assert str(query) == "DELETE FROM tournament_costs WHERE tournament_id = :tid"
    assert params == {"tid": "cup"}
    # The caller owns the transaction that replaces the cost record.
    db_session.commit.assert_not_awaited()


async def test_cost_input_reconstructs_defaults_and_groups_specific_costs(calculation, settings, player, db_session, result_factory, monkeypatch):
    monkeypatch.setattr(services, "get_tournament_cost_details", AsyncMock(return_value=calculation))
    monkeypatch.setattr(services, "get_or_create_fund_settings", AsyncMock(return_value=settings))
    bob = models.Player(id=2, name="Bob")
    cost = fm.TournamentCost(id=9, venue_fee_per_person=100, ball_fee_per_ball=30, num_balls_purchased=2, common_misc_cost=40, common_misc_name="Water")
    specifics = [fm.PlayerSpecificCost(player=player, cost_amount=15, cost_name="Equipment"), fm.PlayerSpecificCost(player=bob, cost_amount=15, cost_name="Equipment")]
    db_session.execute.side_effect = [result_factory(cost), result_factory(rows=specifics)]
    result = await services.get_tournament_cost_input(DAY, db_session)
    assert result.use_default_venue_fee is True
    assert result.use_default_ball_fee is False
    assert result.tournament_players == ["Alice"]
    assert result.club_members == []
    assert result.player_specific_costs[0].player_names == ["Alice", "Bob"]
    assert result.player_specific_costs[0].cost_amount == 15


@pytest.mark.parametrize("method", ["get_payment_history", "get_player_tournament_costs", "get_player_misc_costs"])
async def test_empty_reports_handle_zero_page_size(method, db_session, result_factory):
    db_session.execute.side_effect = [result_factory(), result_factory(rows=[])]
    if method == "get_payment_history":
        result = await services.get_payment_history(1, 0, None, db_session)
    else:
        result = await getattr(services, method)(1, 1, 0, db_session)
    assert result.total == result.total_pages == 0
    assert result.items == []
