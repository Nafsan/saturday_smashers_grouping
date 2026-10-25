"""Official bracket rules and tournament persistence/attendance behavior."""
from datetime import date

import pytest
from fastapi import HTTPException

import models
import fund_models
import schemas
from tournament import services

pytestmark = pytest.mark.unit


def test_valid_brackets_allow_dynamic_ranks(tournament_data):
    services.validate_tournament_rules(tournament_data)


@pytest.mark.parametrize("rating", [1, 2, 3, 5, 6, 7])
def test_required_bracket_cannot_be_missing(rating, tournament_data):
    tournament_data.ranks = [group for group in tournament_data.ranks if group.rating != rating]
    with pytest.raises(HTTPException) as error:
        services.validate_tournament_rules(tournament_data)
    assert error.value.status_code == 400
    assert "mandatory" in error.value.detail


@pytest.mark.parametrize("rating,count", [(3, 0), (3, 1), (3, 3), (7, 1), (7, 3), (4, 5), (8, 5)])
def test_bracket_player_limits(rating, count, tournament_data):
    tournament_data.ranks = [g for g in tournament_data.ranks if g.rating != rating]
    tournament_data.ranks.append(schemas.RankGroupCreate(rank=99, rating=rating, players=[f"extra-{i}" for i in range(count)]))
    with pytest.raises(HTTPException) as error:
        services.validate_tournament_rules(tournament_data)
    assert error.value.status_code == 400


@pytest.mark.parametrize("count", [0, 1, 4])
def test_quarterfinals_are_optional_and_allow_up_to_four(count, tournament_data):
    tournament_data.ranks.append(schemas.RankGroupCreate(rank=8, rating=8, players=[f"quarter-{i}" for i in range(count)]))
    services.validate_tournament_rules(tournament_data)


def test_duplicate_player_across_brackets_is_rejected(tournament_data):
    tournament_data.ranks[1].players = tournament_data.ranks[0].players.copy()
    with pytest.raises(HTTPException, match="multiple times"):
        services.validate_tournament_rules(tournament_data)


@pytest.mark.parametrize("operation", ["create", "update", "delete"])
async def test_tournament_existence_errors(operation, tournament_data, db_session, result_factory):
    db_session.execute.return_value = result_factory(models.Tournament(id="existing") if operation == "create" else None)
    with pytest.raises(HTTPException) as error:
        if operation == "create":
            await services.create_tournament(tournament_data, db_session)
        elif operation == "update":
            await services.update_tournament("missing", tournament_data, db_session)
        else:
            await services.delete_tournament("missing", db_session)
    assert error.value.status_code == (400 if operation == "create" else 404)
    db_session.commit.assert_not_awaited()


@pytest.mark.parametrize("existing_player,existing_fund", [(True, True), (True, False), (False, False)])
async def test_create_links_players_and_updates_attendance(existing_player, existing_fund, player, tournament_data, db_session, result_factory):
    tournament_data.ranks = [schemas.RankGroupCreate(rank=1, rating=1, players=["Alice"])]
    fund = fund_models.PlayerFund(player_id=1, days_played=3)
    db_session.execute.side_effect = [result_factory(), result_factory(player if existing_player else None), result_factory(player), result_factory(fund if existing_fund else None)]
    response = await services.create_tournament(tournament_data, db_session)
    assert response == {"message": "Tournament added successfully"}
    added = [call.args[0] for call in db_session.add.call_args_list]
    tournament = next(obj for obj in added if isinstance(obj, models.Tournament))
    rank = next(obj for obj in added if isinstance(obj, models.RankGroup))
    assert tournament.is_official is True
    assert rank.players[0].name == "Alice"
    if existing_fund:
        assert fund.days_played == 4
    else:
        assert next(obj for obj in added if isinstance(obj, fund_models.PlayerFund)).days_played == 1
    assert db_session.commit.await_count == 2


async def test_update_replaces_ranks_without_changing_tournament_identity(player, tournament_data, db_session, result_factory):
    old = models.RankGroup(id=9, tournament_id="original", rank=1, rating=1)
    tournament = models.Tournament(id="original", date=date(2025, 1, 1))
    tournament_data.ranks = [schemas.RankGroupCreate(rank=2, rating=2, players=["Alice", "New player"])]
    db_session.execute.side_effect = [result_factory(tournament), result_factory(rows=[old]), result_factory(player), result_factory()]
    assert await services.update_tournament("original", tournament_data, db_session) == {"message": "Tournament updated successfully"}
    assert tournament.id == "original"
    assert tournament.date == tournament_data.date
    db_session.delete.assert_awaited_once_with(old)
    ranks = [c.args[0] for c in db_session.add.call_args_list if isinstance(c.args[0], models.RankGroup)]
    assert [p.name for p in ranks[0].players] == ["Alice", "New player"]
    db_session.commit.assert_awaited_once()


async def test_delete_removes_ranks_before_tournament(db_session, result_factory):
    tournament, rank = models.Tournament(id="cup"), models.RankGroup(id=2)
    db_session.execute.side_effect = [result_factory(tournament), result_factory(rows=[rank])]
    await services.delete_tournament("cup", db_session)
    assert [c.args[0] for c in db_session.delete.await_args_list] == [rank, tournament]
    db_session.commit.assert_awaited_once()


async def test_history_serializes_rank_players(player, db_session, result_factory):
    tournament = models.Tournament(id="cup", date=date(2026, 10, 24), is_official=True, description="Notes", rank_groups=[models.RankGroup(id=2, tournament_id="cup", rank=1, rating=1, players=[player])])
    db_session.execute.return_value = result_factory(rows=[tournament])
    history = await services.get_all_tournaments(db_session)
    assert history[0]["description"] == "Notes"
    assert history[0]["ranks"][0]["players"] == ["Alice"]


async def test_players_by_date_sorted_and_unique(player, db_session, result_factory):
    bob = models.Player(id=2, name="Bob")
    tournament = models.Tournament(rank_groups=[models.RankGroup(players=[bob, player]), models.RankGroup(players=[player])])
    db_session.execute.return_value = result_factory(tournament)
    assert await services.get_tournament_players_by_date(date(2026, 10, 24), db_session) == {"players": ["Alice", "Bob"]}


async def test_players_by_date_missing_tournament(db_session, result_factory):
    db_session.execute.return_value = result_factory()
    with pytest.raises(HTTPException) as error:
        await services.get_tournament_players_by_date(date(2026, 10, 24), db_session)
    assert error.value.status_code == 404


@pytest.mark.parametrize("existing_player,existing_fund", [(True, True), (False, False)])
async def test_create_unofficial_tracks_attendance_without_ranks(existing_player, existing_fund, player, db_session, result_factory):
    request = schemas.CreateUnofficialTournamentRequest(date=date(2026, 10, 24), tournament_players=["Alice"])
    fund = fund_models.PlayerFund(player_id=1, days_played=4)
    db_session.execute.side_effect = [result_factory(), result_factory(player if existing_player else None), result_factory(player), result_factory(fund if existing_fund else None)]
    response = await services.create_unofficial_tournament(request, db_session)
    assert response["tournament_id"] == "unofficial_20261024"
    added = [c.args[0] for c in db_session.add.call_args_list]
    assert next(obj for obj in added if isinstance(obj, models.Tournament)).is_official is False
    assert next(obj for obj in added if isinstance(obj, fund_models.TournamentAttendance)).is_club_member is False
    assert not any(isinstance(obj, models.RankGroup) for obj in added)
    if existing_fund:
        assert fund.days_played == 5
    db_session.commit.assert_awaited_once()


async def test_unofficial_duplicate_date_rejected(db_session, result_factory):
    db_session.execute.return_value = result_factory(models.Tournament(id="existing"))
    with pytest.raises(HTTPException) as error:
        await services.create_unofficial_tournament(schemas.CreateUnofficialTournamentRequest(date=date(2026, 10, 24), tournament_players=[]), db_session)
    assert error.value.status_code == 400
    db_session.commit.assert_not_awaited()
