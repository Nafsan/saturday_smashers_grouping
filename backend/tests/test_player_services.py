"""Player validation, persistence, statistics and deterministic performance analytics."""
from datetime import date
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

import models
from player import services

pytestmark = pytest.mark.unit


@pytest.mark.parametrize("name", [None, "", " ", "\t\n"])
async def test_create_rejects_blank_names(name, db_session):
    with pytest.raises(HTTPException) as error:
        await services.create_player(name, db_session)
    assert error.value.status_code == 400
    db_session.execute.assert_not_awaited()


async def test_create_rejects_duplicate(player, db_session, result_factory):
    db_session.execute.return_value = result_factory(player)
    with pytest.raises(HTTPException, match="already exists"):
        await services.create_player("Alice", db_session)
    db_session.add.assert_not_called()
    db_session.commit.assert_not_awaited()


async def test_create_trims_name_and_persists(db_session, result_factory):
    db_session.execute.return_value = result_factory()

    async def refresh(player):
        player.id, player.is_guest = 7, False

    db_session.refresh.side_effect = refresh
    assert await services.create_player("  Alice  ", db_session) == {
        "id": 7, "name": "Alice", "is_guest": False,
    }
    created = db_session.add.call_args.args[0]
    assert isinstance(created, models.Player)
    db_session.commit.assert_awaited_once()
    db_session.refresh.assert_awaited_once_with(created)


async def test_list_serializes_guest_status(player, db_session, result_factory):
    db_session.execute.return_value = result_factory(rows=[player])
    assert await services.get_all_players(db_session) == [
        {"id": 1, "name": "Alice", "is_guest": False},
    ]
    assert "ORDER BY players.name" in str(db_session.execute.call_args.args[0])


@pytest.mark.parametrize("updates", [{}, {"name": "   "}])
async def test_update_service_validates_input(updates, player, db_session, result_factory):
    db_session.execute.return_value = result_factory(player)
    with pytest.raises(HTTPException) as error:
        await services.update_player(1, db_session, **updates)
    assert error.value.status_code == 400
    db_session.commit.assert_not_awaited()


async def test_statistics_missing_player(db_session, result_factory):
    db_session.execute.return_value = result_factory()
    with pytest.raises(HTTPException) as error:
        await services.get_player_statistics(99, db_session)
    assert error.value.status_code == 404


async def test_statistics_serializes_dates_and_rankings(player, db_session, result_factory):
    tournament = models.Tournament(
        id="cup", date=date(2026, 10, 24), playlist_url="playlist", embed_url="embed",
        rank_groups=[models.RankGroup(id=5, tournament_id="cup", rank=1, rating=1, players=[player])],
    )
    db_session.execute.side_effect = [result_factory(player), result_factory(rows=[tournament])]
    stats = await services.get_player_statistics(1, db_session)
    assert stats == {"player_id": 1, "player_name": "Alice", "tournaments": [{
        "id": "cup", "date": "2026-10-24", "playlist_url": "playlist", "embed_url": "embed",
        "ranks": [{"id": 5, "tournament_id": "cup", "rank": 1, "rating": 1, "players": ["Alice"]}],
    }]}


def insight_stats(ratings, peer_rating=None):
    return {"player_name": "Alice", "tournaments": [{
        "ranks": [
            {"rating": rating, "players": ["Alice"]},
            {"rating": peer_rating or rating, "players": ["Bob"]},
        ],
    } for rating in ratings]}


async def test_insight_welcomes_new_player(monkeypatch, db_session):
    monkeypatch.setattr(services, "get_player_statistics", AsyncMock(return_value=insight_stats([])))
    inference = MagicMock()
    monkeypatch.setattr(services, "InferenceClient", inference)
    insight = await services.generate_player_insight(1, db_session)
    assert insight["archetype"] == "New Contender"
    assert insight["metrics"]["total_tournaments"] == "0"
    assert insight["form_score"] == 50
    inference.assert_not_called()


@pytest.mark.parametrize("ratings, archetype, momentum, consistency, score", [
    ([1, 1, 1], "Elite Cup Contender", "Peak Form", "Rock Solid", 95),
    ([3] * 5, "Cup Division Regular", "Steady", "Rock Solid", 75),
    ([5, 6, 7, 8], "Plate Division Fighter", "Relegation Risk", "Rock Solid", 35),
    ([4, 4], "Cup Division Regular", "Steady", "Rock Solid", 65),
    ([4, 6], "New Challenger", "Steady", "Rock Solid", 52),
    ([4, 4, 4, 4, 6, 8, 8, 8], "Developing Player", "Heating Up", "Balanced", 60),
    ([1, 4, 4, 4, 8], "Elite Cup Contender", "Volatile", "Inconsistent", 62),
])
async def test_insight_analytics(ratings, archetype, momentum, consistency, score, monkeypatch, db_session):
    monkeypatch.setattr(services, "get_player_statistics", AsyncMock(return_value=insight_stats(ratings)))
    data = await services.generate_player_insight(1, db_session)
    assert data["archetype"] == archetype
    assert data["momentum"] == momentum
    assert data["consistency"] == consistency
    assert data["form_score"] == score
    assert data["metrics"]["total_tournaments"] == str(len(ratings))
    assert data["metrics"]["peer_competitor"] == f"Bob ({len(ratings)} Shared Levels)"
    assert len(data["key_insights"]) == 3


@pytest.mark.parametrize("rating, peer, expected", [(1, 2, "Shared Levels"), (5, 6, "Shared Levels"), (1, 8, "Shared Tournaments")])
async def test_insight_pairs_finalists_as_peers(rating, peer, expected, monkeypatch, db_session):
    monkeypatch.setattr(services, "get_player_statistics", AsyncMock(return_value=insight_stats([rating], peer)))
    data = await services.generate_player_insight(1, db_session)
    assert data["metrics"]["peer_competitor"] == f"Bob (1 {expected})"


async def test_insight_handles_stats_failure(monkeypatch, db_session):
    monkeypatch.setattr(services, "get_player_statistics", AsyncMock(side_effect=HTTPException(404)))
    data = await services.generate_player_insight(99, db_session)
    assert data["archetype"] == "Player"
    assert data["key_insights"] == []


async def test_insight_falls_back_when_ai_fails(monkeypatch, db_session):
    monkeypatch.setenv("HF_TOKEN", "test-token")
    monkeypatch.setattr(services, "get_player_statistics", AsyncMock(return_value=insight_stats([1])))
    inference = MagicMock(side_effect=RuntimeError("AI unavailable"))
    monkeypatch.setattr(services, "InferenceClient", inference)
    data = await services.generate_player_insight(1, db_session)
    assert data["archetype"] == "Elite Cup Contender"
    assert data["metrics"]["cup_win_rate"] == "100%"


async def test_insight_uses_ai_text_but_preserves_calculated_metrics(monkeypatch, db_session):
    monkeypatch.setenv("HF_TOKEN", "test-token")
    monkeypatch.setattr(services, "get_player_statistics", AsyncMock(return_value=insight_stats([1])))
    inference = MagicMock()
    inference.return_value.chat_completion.return_value = SimpleNamespace(choices=[
        SimpleNamespace(message=SimpleNamespace(content='```json\n{"headline": "Excellent form", "archetype": "Cup Specialist", "key_insights": []}\n```')),
    ])
    monkeypatch.setattr(services, "InferenceClient", inference)
    data = await services.generate_player_insight(1, db_session)
    assert data["headline"] == "Excellent form"
    assert data["archetype"] == "Cup Specialist"
    assert data["form_score"] == 95
    assert data["metrics"]["cup_win_rate"] == "100%"
    prompt = inference.return_value.chat_completion.call_args.kwargs["messages"][0]["content"]
    assert "Alice" in prompt


@pytest.mark.parametrize("content", ["Not JSON", "{broken}"])
async def test_insight_falls_back_on_malformed_ai_output(content, monkeypatch, db_session):
    monkeypatch.setenv("HF_TOKEN", "test-token")
    monkeypatch.setattr(services, "get_player_statistics", AsyncMock(return_value=insight_stats([1])))
    inference = MagicMock()
    inference.return_value.chat_completion.return_value = SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])
    monkeypatch.setattr(services, "InferenceClient", inference)
    data = await services.generate_player_insight(1, db_session)
    assert data["archetype"] == "Elite Cup Contender"


async def test_leaderboard_serializes_trophy_counts(db_session, result_factory):
    db_session.execute.return_value = result_factory(rows=[SimpleNamespace(name="Alice", trophy_count=3, tournaments_played=5)])
    assert await services.get_trophy_leaderboard(db_session) == [
        {"name": "Alice", "trophy_count": 3, "tournaments_played": 5},
    ]
