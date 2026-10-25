"""HTTP contracts: authentication, validation, delegation and cache invalidation."""
from datetime import datetime
from unittest.mock import AsyncMock
from urllib.parse import parse_qsl, urlsplit

import pytest

from database import ADMIN_PASSWORD
from club_tournament.cache import club_cache

pytestmark = pytest.mark.api
DAY = "2026-10-24"
COST = {"tournament_date": DAY, "use_default_venue_fee": True, "use_default_ball_fee": True,
        "tournament_players": ["Alice"], "num_balls_purchased": 1}
RESULT = {"total_players": 4, "champion": "Alice", "runner_up": "Bob", "semi_finalist_1": "Carol", "semi_finalist_2": "Dave"}
CLUB = {"venue_id": 1, "category": "Singles", "tournament_datetime": "2026-10-24T12:00:00"}

# Every write route is exercised with wrong and missing credentials.
WRITES = [
    ("POST", "/players", {"name": "Alice"}), ("PUT", "/players/1", {"is_guest": True}),
    ("POST", "/history", {"id": "cup", "date": DAY, "ranks": []}),
    ("PUT", "/history/cup", {"id": "cup", "date": DAY, "ranks": []}),
    ("PATCH", "/history/cup/unofficial-details", {"description": "Notes"}),
    ("DELETE", "/history/cup", None),
    ("POST", "/history/create-unofficial", {"date": DAY, "tournament_players": []}),
    ("POST", "/fund/settings", {"default_venue_fee": 100, "default_ball_fee": 20}),
    ("POST", "/fund/settings/next-tournament?next_date=2026-10-24", None),
    ("POST", "/fund/seed", {"players": []}),
    ("POST", "/fund/tournament-costs/calculate", COST),
    ("POST", "/fund/tournament-costs/save", COST),
    ("POST", "/fund/record-payment", {"player_name": "Alice", "amount": 50}),
    ("PUT", "/fund/payments/1", {"player_name": "Alice", "amount": 50, "payment_date": DAY}),
    ("DELETE", "/fund/payments/1", None),
    ("POST", "/fund/player-misc-cost", {"player_names": ["Alice"], "cost_amount": 50}),
    ("POST", "/club-venues", {"name": "Arena"}),
    ("PUT", "/club-venues/1", {"name": "Arena"}),
    ("DELETE", "/club-venues/1", None),
    ("POST", "/club-tournaments", CLUB),
    ("PUT", "/club-tournaments/1", CLUB),
    ("DELETE", "/club-tournaments/1", None),
    ("POST", "/club-tournaments/1/results", RESULT),
    ("PUT", "/club-tournaments/1/results", RESULT),
    ("POST", "/club-tournaments/bulk-import", {"tournaments": [CLUB]}),
]


@pytest.mark.parametrize("method,path,payload", WRITES)
@pytest.mark.parametrize("password,status", [("wrong", 403), (None, 422)])
async def test_write_endpoints_require_admin(method, path, payload, password, status, client, db_session):
    url = urlsplit(path)
    params = dict(parse_qsl(url.query))
    if password is not None:
        params["password"] = password
    response = await client.request(method, url.path, json=payload, params=params)
    assert response.status_code == status, response.text
    db_session.execute.assert_not_awaited()
    db_session.commit.assert_not_awaited()


async def test_all_write_routes_have_auth_cases(app):
    covered = {(method, path.split("?")[0]) for method, path, _ in WRITES}
    for route in app.routes:
        for method in getattr(route, "methods", set()) & {"POST", "PUT", "PATCH", "DELETE"}:
            # Replace concrete IDs with the route parameter names for comparison.
            assert any(method == m and route.path == p.replace("/players/1", "/players/{player_id}")
                       .replace("/history/cup", "/history/{tournament_id}")
                       .replace("/fund/payments/1", "/fund/payments/{payment_id}")
                       .replace("/club-venues/1", "/club-venues/{venue_id}")
                       .replace("/club-tournaments/1", "/club-tournaments/{tournament_id}")
                       for m, p in covered), route.path


@pytest.mark.parametrize("path", ["/players", "/history", "/fund/balances", "/fund/attendance", "/fund/tournament-costs/dates", "/fund/days-played-comparison"])
async def test_public_lists_return_empty_arrays(path, client, db_session, result_factory):
    db_session.execute.return_value = result_factory(rows=[])
    response = await client.get(path)
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.parametrize("path", ["/fund/payments/history", "/fund/players/1/tournament-costs", "/fund/players/1/misc-costs"])
async def test_empty_paginated_fund_reports(path, client, db_session, result_factory):
    db_session.execute.side_effect = [result_factory(0), result_factory(rows=[])]
    response = await client.get(path, params={"page": 2, "page_size": 10})
    assert response.status_code == 200
    assert response.json() == {"items": [], "total": 0, "page": 2, "page_size": 10, "total_pages": 0}


@pytest.mark.parametrize("method,path,payload,service", [
    ("POST", "/fund/seed", {"players": []}, "seed_initial_player_data"),
    ("POST", "/fund/tournament-costs/save", COST, "save_tournament_costs_and_update_balances"),
    ("POST", "/fund/record-payment", {"player_name": "Alice", "amount": 50}, "record_player_payment"),
    ("PUT", "/fund/payments/1", {"player_name": "Alice", "amount": 50, "payment_date": DAY}, "update_player_payment"),
    ("DELETE", "/fund/payments/1", None, "delete_player_payment"),
    ("POST", "/fund/player-misc-cost", {"player_names": ["Alice"], "cost_amount": 50}, "add_player_misc_cost"),
])
async def test_authorized_fund_writes_delegate(method, path, payload, service, client, monkeypatch, db_session):
    from fund import services
    action = AsyncMock(return_value={"message": "Saved"})
    monkeypatch.setattr(services, service, action)
    response = await client.request(method, path, params={"password": ADMIN_PASSWORD}, json=payload)
    assert response.status_code == 200
    assert response.json() == {"message": "Saved"}
    assert action.await_args.args[-1] is db_session


async def test_fund_settings_endpoints(client, db_session, result_factory):
    from fund_models import FundSettings
    settings = FundSettings(id=1, default_venue_fee=100, default_ball_fee=20, updated_at=datetime(2026, 10, 24))
    db_session.execute.return_value = result_factory(settings)
    assert (await client.get("/fund/settings")).json()["default_venue_fee"] == 100
    response = await client.post("/fund/settings", params={"password": ADMIN_PASSWORD}, json={"default_venue_fee": 150, "default_ball_fee": 30})
    assert response.status_code == 200
    assert response.json()["default_ball_fee"] == 30
    response = await client.post("/fund/settings/next-tournament", params={"password": ADMIN_PASSWORD, "next_date": DAY})
    assert response.json() == {"next_tournament_date": DAY}


async def test_tournament_create_and_update_validate_before_saving(client, tournament_data, monkeypatch):
    from tournament import services
    create = AsyncMock(return_value={"message": "Created"})
    update = AsyncMock(return_value={"message": "Updated"})
    monkeypatch.setattr(services, "create_tournament", create)
    monkeypatch.setattr(services, "update_tournament", update)
    response = await client.post("/history", params={"password": ADMIN_PASSWORD}, json=tournament_data.model_dump(mode="json"))
    assert response.status_code == 201
    create.assert_awaited_once()
    response = await client.put("/history/cup", params={"password": ADMIN_PASSWORD}, json=tournament_data.model_dump(mode="json"))
    assert response.status_code == 200
    update.assert_awaited_once()
    tournament_data.ranks = []
    response = await client.post("/history", params={"password": ADMIN_PASSWORD}, json=tournament_data.model_dump(mode="json"))
    assert response.status_code == 400
    assert create.await_count == 1


@pytest.mark.parametrize("value", ["invalid", "2026-02-30"])
async def test_players_by_date_rejects_bad_dates(value, client, db_session):
    response = await client.get("/history/players-by-date", params={"date": value})
    assert response.status_code == 400
    db_session.execute.assert_not_awaited()


async def test_history_extra_write_and_lookup_routes(client, monkeypatch):
    from tournament import services
    for name, result in [("delete_tournament", {"message": "Deleted"}), ("create_unofficial_tournament", {"tournament_id": "friendly"}), ("get_tournament_players_by_date", {"players": ["Alice"]})]:
        monkeypatch.setattr(services, name, AsyncMock(return_value=result))
    assert (await client.delete("/history/cup", params={"password": ADMIN_PASSWORD})).json() == {"message": "Deleted"}
    assert (await client.post("/history/create-unofficial", params={"password": ADMIN_PASSWORD}, json={"date": DAY, "tournament_players": ["Alice"]})).status_code == 201
    assert (await client.get("/history/players-by-date", params={"date": DAY})).json() == {"players": ["Alice"]}


async def test_player_read_and_create_contracts(client, monkeypatch):
    from player import services
    monkeypatch.setattr(services, "create_player", AsyncMock(return_value={"id": 1, "name": "Alice", "is_guest": False}))
    response = await client.post("/players", params={"password": ADMIN_PASSWORD}, json={"name": "Alice"})
    assert response.status_code == 201
    assert response.json()["id"] == 1
    for path, service, result in [
        ("/players/1/statistics", "get_player_statistics", {"player_id": 1, "tournaments": []}),
        ("/players/1/insights", "generate_player_insight", {"headline": "Welcome"}),
        ("/players/trophy-leaderboard", "get_trophy_leaderboard", []),
    ]:
        monkeypatch.setattr(services, service, AsyncMock(return_value=result))
        response = await client.get(path)
        assert response.status_code == 200
        assert response.json() == result


@pytest.mark.parametrize("method,path,payload,service,status", [
    ("POST", "/club-tournaments", CLUB, "create_tournament", 201),
    ("PUT", "/club-tournaments/1", CLUB, "update_tournament", 200),
    ("DELETE", "/club-tournaments/1", None, "delete_tournament", 200),
    ("POST", "/club-tournaments/1/results", RESULT, "submit_results", 201),
    ("PUT", "/club-tournaments/1/results", RESULT, "update_results", 200),
    ("POST", "/club-tournaments/bulk-import", {"tournaments": [CLUB]}, "bulk_import_tournaments", 201),
    ("DELETE", "/club-venues/1", None, "delete_venue", 200),
])
async def test_club_writes_invalidate_cache(method, path, payload, service, status, client, monkeypatch):
    from club_tournament import services
    action = AsyncMock(return_value={"message": "Saved"})
    monkeypatch.setattr(services, service, action)
    club_cache.set("existing", [1])
    response = await client.request(method, path, params={"password": ADMIN_PASSWORD}, json=payload)
    assert response.status_code == status, response.text
    assert club_cache.get("existing") is None
    action.assert_awaited_once()


@pytest.mark.parametrize("method,path", [("POST", "/club-venues"), ("PUT", "/club-venues/1")])
async def test_venue_write_contract(method, path, client, monkeypatch):
    from club_tournament import services
    venue = {"id": 1, "name": "Arena", "created_at": "2026-10-24T12:00:00", "whatsapp_links": []}
    monkeypatch.setattr(services, "create_venue" if method == "POST" else "update_venue", AsyncMock(return_value=venue))
    club_cache.set("existing", [1])
    response = await client.request(method, path, params={"password": ADMIN_PASSWORD}, json={"name": "Arena"})
    assert response.status_code == (201 if method == "POST" else 200)
    assert response.json()["name"] == "Arena"
    assert club_cache.get("existing") is None


async def test_club_lists_cache_by_query(client, monkeypatch):
    from club_tournament import services
    action = AsyncMock(return_value={"items": [], "total_count": 0})
    monkeypatch.setattr(services, "get_all_tournaments", action)
    await client.get("/club-tournaments")
    await client.get("/club-tournaments")
    action.assert_awaited_once()
    await client.get("/club-tournaments", params={"venue_id": 1})
    assert action.await_count == 2
    venues = AsyncMock(return_value=[{"id": 1, "name": "Arena", "created_at": "2026-10-24T12:00:00", "whatsapp_links": []}])
    monkeypatch.setattr(services, "get_all_venues", venues)
    assert (await client.get("/club-venues")).status_code == 200
    await client.get("/club-venues")
    venues.assert_awaited_once()


async def test_api_validation_does_not_touch_database(client, db_session):
    for path, payload in [("/players", {}), ("/fund/record-payment", {"amount": "invalid"}), ("/club-tournaments", {**CLUB, "tournament_datetime": "invalid"})]:
        assert (await client.post(path, params={"password": ADMIN_PASSWORD}, json=payload)).status_code == 422
    db_session.execute.assert_not_awaited()


async def test_cors_preflight(client):
    response = await client.options("/players", headers={"Origin": "https://example.test", "Access-Control-Request-Method": "GET"})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "*"
