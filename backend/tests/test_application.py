"""App health/startup and database configuration without a real database."""
import importlib.util
from datetime import datetime
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest

import database

pytestmark = pytest.mark.unit


def fake_engine(monkeypatch):
    import main
    engine = MagicMock()
    connection = AsyncMock()
    engine.connect.return_value.__aenter__.return_value = connection
    engine.begin.return_value.__aenter__.return_value = connection
    monkeypatch.setattr(main, "engine", engine)
    return engine, connection


@pytest.mark.api
async def test_health_get_and_head(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    datetime.fromisoformat(response.json()["timestamp"])
    head = await client.head("/health")
    assert head.status_code == 200
    assert head.content == b""


@pytest.mark.api
async def test_database_health_success(client, monkeypatch):
    _, connection = fake_engine(monkeypatch)
    response = await client.get("/health/db")
    assert response.status_code == 200
    assert response.json()["database"] == "connected"
    assert response.json()["response_time_ms"] >= 0
    assert str(connection.execute.await_args.args[0]) == "SELECT 1"
    assert (await client.head("/health/db")).status_code == 200


@pytest.mark.api
async def test_database_health_failure(client, monkeypatch):
    _, connection = fake_engine(monkeypatch)
    connection.execute.side_effect = RuntimeError("Database unavailable")
    response = await client.get("/health/db")
    assert response.json()["status"] == "unhealthy"
    assert response.json()["database"] == "disconnected"
    assert response.json()["error"] == "Database unavailable"


async def test_startup_initializes_schema_and_rls(monkeypatch, result_factory):
    import main
    _, connection = fake_engine(monkeypatch)
    connection.execute.side_effect = [result_factory(), result_factory(rows=[("players",), ("tournaments",)]), result_factory(), result_factory()]
    await main.startup()
    connection.run_sync.assert_awaited_once_with(database.Base.metadata.create_all)
    queries = [str(c.args[0]) for c in connection.execute.await_args_list]
    assert "ADD COLUMN IF NOT EXISTS description" in queries[0]
    assert 'ALTER TABLE "players" ENABLE ROW LEVEL SECURITY;' in queries
    assert 'ALTER TABLE "tournaments" ENABLE ROW LEVEL SECURITY;' in queries


async def test_startup_logs_rls_failure(monkeypatch, result_factory, caplog):
    import main
    _, connection = fake_engine(monkeypatch)
    connection.execute.side_effect = [result_factory(), RuntimeError("Permission denied")]
    await main.startup()
    assert "Failed to automatically enable RLS" in caplog.text


@pytest.mark.parametrize("url,expected", [
    (None, "postgresql+asyncpg://user:password@localhost/dbname"),
    ("postgres://test:pass@localhost/test", "postgresql+asyncpg://test:pass@localhost/test"),
    ("postgresql://test:pass@localhost/test", "postgresql+asyncpg://test:pass@localhost/test"),
    ("postgresql+asyncpg://test:p@ss@localhost/test", "postgresql+asyncpg://test:p%40ss@localhost/test"),
    ("postgresql+asyncpg://test:pass@localhost/test", "postgresql+asyncpg://test:pass@localhost/test"),
])
def test_database_configuration_normalizes_urls(url, expected, monkeypatch):
    import dotenv
    import sqlalchemy.ext.asyncio
    monkeypatch.setattr(dotenv, "load_dotenv", lambda: None)
    if url is None:
        monkeypatch.delenv("DATABASE_URL", raising=False)
    else:
        monkeypatch.setenv("DATABASE_URL", url)
    factory = MagicMock()
    monkeypatch.setattr(sqlalchemy.ext.asyncio, "create_async_engine", factory)
    # Execute under a separate module name so models retain their original Base.
    spec = importlib.util.spec_from_file_location("isolated_test_database", Path(database.__file__))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    assert module.DATABASE_URL == expected
    assert factory.call_args.args[0] == expected
    assert factory.call_args.kwargs["connect_args"]["statement_cache_size"] == 0


async def test_get_db_yields_and_closes_session(monkeypatch, db_session):
    context = MagicMock()
    context.__aenter__ = AsyncMock(return_value=db_session)
    context.__aexit__ = AsyncMock(return_value=False)
    monkeypatch.setattr(database, "AsyncSessionLocal", MagicMock(return_value=context))
    dependency = database.get_db()
    assert await dependency.__anext__() is db_session
    await dependency.aclose()
    context.__aexit__.assert_awaited_once()
