"""Club venue lifecycle, tournament status/serialization, results and bulk import."""
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from club_tournament import services, schemas
from club_tournament.models import ClubVenue, ClubVenueWhatsappLink, ClubTournament, ClubTournamentResult

pytestmark = pytest.mark.unit
NOW = datetime(2026, 10, 25, 12)


@pytest.fixture
def venue():
    return ClubVenue(id=1, name="Smash Arena", created_at=NOW, whatsapp_links=[
        ClubVenueWhatsappLink(id=2, label="Members", link="https://chat.whatsapp.com/test"),
    ])


@pytest.fixture
def tournament(venue):
    return ClubTournament(id=3, venue_id=1, venue=venue, category="Singles",
                          tournament_datetime=NOW + timedelta(days=1),
                          total_players=16, result=None, whatsapp_link=None,
                          created_at=NOW, updated_at=NOW)


@pytest.fixture
def result_data():
    return schemas.ClubTournamentResultCreate(total_players=8, champion="Alice", runner_up="Bob",
                                              semi_finalist_1="Carol", semi_finalist_2="Dave")


@pytest.mark.parametrize("offset,status", [(1, "upcoming"), (0, "past"), (-1, "past")])
def test_status_uses_bdt_boundary(offset, status, monkeypatch):
    monkeypatch.setattr(services, "_get_now_bdt", lambda: NOW)
    assert services._derive_tournament_status(NOW + timedelta(seconds=offset)) == status


def test_bdt_clock_offset(monkeypatch):
    class Clock:
        @staticmethod
        def utcnow():
            return NOW
    monkeypatch.setattr(services, "datetime", Clock)
    assert services._get_now_bdt() == NOW + timedelta(hours=6)


@pytest.mark.parametrize("schema", [schemas.ClubTournamentCreate, schemas.ClubTournamentUpdate, schemas.BulkTournamentEntry])
def test_schemas_preserve_wall_time_and_strip_timezone(schema):
    aware = NOW.replace(tzinfo=timezone(timedelta(hours=6)))
    parsed = schema(venue_id=1, category="Singles", tournament_datetime=aware)
    assert parsed.tournament_datetime == NOW
    assert parsed.tournament_datetime.tzinfo is None


@pytest.mark.parametrize("with_result", [False, True])
def test_tournament_serialization(with_result, tournament, venue, monkeypatch):
    monkeypatch.setattr(services, "_get_now_bdt", lambda: NOW)
    if with_result:
        tournament.result = ClubTournamentResult(id=4, champion="Alice", runner_up="Bob", created_at=NOW)
        tournament.whatsapp_link = venue.whatsapp_links[0]
    data = services._tournament_to_dict(tournament)
    assert data["status"] == "upcoming"
    assert data["venue"]["whatsapp_links"][0]["label"] == "Members"
    assert data["total_players"] == 16
    if with_result:
        assert data["result"]["champion"] == "Alice"
        assert data["result"]["quarter_finalist_1"] is None
        assert data["whatsapp_link"]["id"] == 2
    else:
        assert data["result"] is data["whatsapp_link"] is None


async def test_list_and_get_venue(venue, db_session, result_factory):
    db_session.execute.side_effect = [result_factory(rows=[venue]), result_factory(venue)]
    assert await services.get_all_venues(db_session) == [venue]
    assert await services.get_venue_by_id(1, db_session) is venue


@pytest.mark.parametrize("operation", ["get", "update", "delete"])
async def test_missing_venue(operation, db_session, result_factory):
    db_session.execute.return_value = result_factory()
    with pytest.raises(HTTPException) as error:
        if operation == "get":
            await services.get_venue_by_id(1, db_session)
        elif operation == "update":
            await services.update_venue(1, schemas.ClubVenueUpdate(name="New"), db_session)
        else:
            await services.delete_venue(1, db_session)
    assert error.value.status_code == 404
    db_session.commit.assert_not_awaited()


@pytest.mark.parametrize("operation", ["create", "update"])
async def test_duplicate_venue_name(operation, venue, db_session, result_factory):
    db_session.execute.side_effect = [result_factory(venue), result_factory(ClubVenue(name="Other"))]
    with pytest.raises(HTTPException) as error:
        if operation == "create":
            await services.create_venue(schemas.ClubVenueCreate(name=venue.name), db_session)
        else:
            await services.update_venue(1, schemas.ClubVenueUpdate(name="Other"), db_session)
    assert error.value.status_code == 400
    db_session.commit.assert_not_awaited()


async def test_create_venue_with_whatsapp_links(venue, db_session, result_factory, monkeypatch):
    db_session.execute.return_value = result_factory()
    monkeypatch.setattr(services, "get_venue_by_id", AsyncMock(return_value=venue))
    result = await services.create_venue(schemas.ClubVenueCreate(name=venue.name, whatsapp_links=[schemas.ClubVenueWhatsappLinkCreate(label="Members", link="https://chat.whatsapp.com/test")]), db_session)
    assert result is venue
    added = [call.args[0] for call in db_session.add.call_args_list]
    assert added[0].name == venue.name
    assert added[1].label == "Members"
    db_session.flush.assert_awaited_once()
    db_session.commit.assert_awaited_once()


async def test_update_venue_can_replace_or_clear_links(venue, db_session, result_factory, monkeypatch):
    db_session.execute.side_effect = [result_factory(venue), result_factory(), result_factory()]
    monkeypatch.setattr(services, "get_venue_by_id", AsyncMock(return_value=venue))
    await services.update_venue(1, schemas.ClubVenueUpdate(name="Renamed", logo_base64="logo", whatsapp_links=[]), db_session)
    assert (venue.name, venue.logo_base64) == ("Renamed", "logo")
    assert any("DELETE FROM club_venue_whatsapp_links" in str(c.args[0]) for c in db_session.execute.await_args_list)
    db_session.commit.assert_awaited_once()


@pytest.mark.parametrize("in_use", [False, True])
async def test_venue_delete_protects_existing_tournaments(in_use, venue, tournament, db_session, result_factory):
    db_session.execute.side_effect = [result_factory(venue), result_factory(tournament if in_use else None)]
    if in_use:
        with pytest.raises(HTTPException) as error:
            await services.delete_venue(1, db_session)
        assert error.value.status_code == 400
        db_session.delete.assert_not_awaited()
    else:
        assert "deleted" in (await services.delete_venue(1, db_session))["message"]
        db_session.delete.assert_awaited_once_with(venue)


async def test_get_missing_tournament(db_session, result_factory):
    db_session.execute.return_value = result_factory()
    with pytest.raises(HTTPException) as error:
        await services.get_tournament_by_id(99, db_session)
    assert error.value.status_code == 404


@pytest.mark.parametrize("venue_exists", [False, True])
async def test_create_tournament_checks_venue(venue_exists, venue, tournament, db_session, result_factory, monkeypatch):
    db_session.execute.return_value = result_factory(venue if venue_exists else None)
    monkeypatch.setattr(services, "get_tournament_by_id", AsyncMock(return_value=tournament))
    data = schemas.ClubTournamentCreate(venue_id=1, category="Singles", tournament_datetime=NOW)
    if not venue_exists:
        with pytest.raises(HTTPException) as error:
            await services.create_tournament(data, db_session)
        assert error.value.status_code == 404
        db_session.commit.assert_not_awaited()
    else:
        result = await services.create_tournament(data, db_session)
        assert result["id"] == 3
        assert db_session.add.call_args.args[0].venue_id == 1
        db_session.commit.assert_awaited_once()


async def test_update_tournament_updates_only_requested_fields(venue, tournament, db_session, result_factory, monkeypatch):
    monkeypatch.setattr(services, "get_tournament_by_id", AsyncMock(return_value=tournament))
    db_session.execute.return_value = result_factory(venue)
    await services.update_tournament(3, schemas.ClubTournamentUpdate(venue_id=1, category="Doubles", total_players=0, announcement="Details", online_link="https://example.test", tournament_datetime=NOW, whatsapp_link_id=2), db_session)
    assert (tournament.category, tournament.total_players, tournament.announcement) == ("Doubles", 0, "Details")
    assert tournament.whatsapp_link_id == 2
    assert tournament.tournament_datetime == NOW
    db_session.commit.assert_awaited_once()


async def test_update_rejects_missing_venue(tournament, db_session, result_factory, monkeypatch):
    monkeypatch.setattr(services, "get_tournament_by_id", AsyncMock(return_value=tournament))
    db_session.execute.return_value = result_factory()
    with pytest.raises(HTTPException) as error:
        await services.update_tournament(3, schemas.ClubTournamentUpdate(venue_id=99), db_session)
    assert error.value.status_code == 404
    db_session.commit.assert_not_awaited()


async def test_delete_tournament(tournament, db_session, monkeypatch):
    monkeypatch.setattr(services, "get_tournament_by_id", AsyncMock(return_value=tournament))
    await services.delete_tournament(3, db_session)
    db_session.delete.assert_awaited_once_with(tournament)
    db_session.commit.assert_awaited_once()


@pytest.mark.parametrize("operation", ["submit", "update"])
async def test_result_preconditions(operation, tournament, result_data, db_session, monkeypatch):
    tournament.result = ClubTournamentResult(champion="Existing") if operation == "submit" else None
    monkeypatch.setattr(services, "get_tournament_by_id", AsyncMock(return_value=tournament))
    with pytest.raises(HTTPException) as error:
        await (services.submit_results if operation == "submit" else services.update_results)(3, result_data, db_session)
    assert error.value.status_code == (400 if operation == "submit" else 404)
    db_session.commit.assert_not_awaited()


@pytest.mark.parametrize("operation", ["submit", "update"])
async def test_results_support_four_player_bracket(operation, tournament, result_data, db_session, monkeypatch):
    if operation == "update":
        tournament.result = ClubTournamentResult(champion="Old")
    monkeypatch.setattr(services, "get_tournament_by_id", AsyncMock(return_value=tournament))
    result_data.online_link = "https://example.test/results"
    await (services.submit_results if operation == "submit" else services.update_results)(3, result_data, db_session)
    result = tournament.result if operation == "update" else db_session.add.call_args.args[0]
    assert result.champion == "Alice"
    assert result.quarter_finalist_1 is None
    assert tournament.total_players == 8
    assert tournament.online_link == result_data.online_link
    db_session.commit.assert_awaited_once()


async def test_list_invalid_status_fails_before_query(db_session):
    with pytest.raises(HTTPException) as error:
        await services.get_all_tournaments(db_session, status_filter="invalid")
    assert error.value.status_code == 400
    db_session.execute.assert_not_awaited()


@pytest.mark.parametrize("status_filter,expected", [("all", 2), ("upcoming", 1), ("past", 1)])
async def test_list_filters_derived_status(status_filter, expected, venue, tournament, db_session, result_factory, monkeypatch):
    monkeypatch.setattr(services, "_get_now_bdt", lambda: NOW)
    past = ClubTournament(id=4, venue_id=1, venue=venue, category="Singles", tournament_datetime=NOW - timedelta(days=1), result=None, whatsapp_link=None)
    db_session.execute.side_effect = [result_factory(2), result_factory(rows=[tournament, past])]
    result = await services.get_all_tournaments(db_session, status_filter=status_filter)
    assert len(result["items"]) == expected
    assert result["page"] == 1


@pytest.mark.parametrize("start,end", [("2026-10-01", "2026-10-31"), ("invalid", "invalid")])
async def test_list_query_filters_and_pagination(start, end, db_session, result_factory):
    db_session.execute.side_effect = [result_factory(21), result_factory(rows=[])]
    result = await services.get_all_tournaments(db_session, venue_id=1, start_date=start, end_date=end, search_query="Singles", page=2, page_size=20)
    assert result["total_pages"] == 2
    count, fetch = [c.args[0] for c in db_session.execute.await_args_list]
    for query in (count, fetch):
        assert "venue_id" in str(query)
        assert "category" in str(query)
    assert 20 in fetch.compile().params.values()


async def test_bulk_import_skips_unknown_venues(db_session, result_factory):
    db_session.execute.return_value = result_factory()
    result = await services.bulk_import_tournaments([schemas.BulkTournamentEntry(venue_id=99, category="Singles", tournament_datetime=NOW)], db_session)
    assert result == {"created": 0, "errors": ["Row 1: Venue ID 99 not found"], "total": 1}
    db_session.add.assert_not_called()


async def test_bulk_import_accepts_entry_without_optional_whatsapp_label(venue, db_session, result_factory):
    db_session.execute.return_value = result_factory(venue)
    result = await services.bulk_import_tournaments([schemas.BulkTournamentEntry(venue_id=1, category="Singles", tournament_datetime=NOW, champion="Alice", runner_up="Bob")], db_session)
    assert result == {"created": 1, "errors": [], "total": 1}
    assert any(isinstance(c.args[0], ClubTournamentResult) for c in db_session.add.call_args_list)


async def test_bulk_import_resolves_whatsapp_label(venue, db_session, result_factory):
    link = venue.whatsapp_links[0]
    db_session.execute.side_effect = [result_factory(venue), result_factory(link)]
    result = await services.bulk_import_tournaments([schemas.BulkTournamentEntry(
        venue_id=1, category="Singles", tournament_datetime=NOW, whatsapp_link_label="Members",
    )], db_session)
    assert result["created"] == 1
    assert result["errors"] == []
    assert db_session.add.call_args.args[0].whatsapp_link_id == link.id
