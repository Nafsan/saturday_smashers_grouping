"""Shared, offline fixtures. Never load production credentials or open a database."""
import os
import socket
import asyncio
from datetime import date
from unittest.mock import AsyncMock, MagicMock

# Set before importing any application module: load_dotenv does not override these.
os.environ["DATABASE_URL"] = "postgresql+asyncpg://test:test@127.0.0.1:1/test"
os.environ["ADMIN_PASSWORD"] = "pytest-admin-only"
os.environ["HF_TOKEN"] = ""
os.environ["SQL_ECHO"] = "false"

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, AsyncEngine

import database
import models
import schemas
from club_tournament.cache import club_cache


@pytest.fixture(autouse=True)
def isolate_external_resources(monkeypatch, tmp_path):
    """Fail closed on accidental network/DB access; isolate both application caches."""
    def forbidden(*args, **kwargs):
        raise AssertionError("External I/O is disabled in unit tests; mock the dependency")

    # Leave socketpair available for Windows asyncio event-loop initialization.
    monkeypatch.setattr(socket, "create_connection", forbidden)
    monkeypatch.setattr(asyncio.BaseEventLoop, "create_connection", forbidden)
    monkeypatch.setattr(AsyncEngine, "connect", forbidden)
    monkeypatch.setattr(AsyncEngine, "begin", forbidden)
    monkeypatch.setattr(database, "AsyncSessionLocal", forbidden)
    from ranking import api
    monkeypatch.setattr(api, "CACHE_DIR", str(tmp_path))
    club_cache.clear()
    yield
    club_cache.clear()


@pytest.fixture
def db_session():
    # SQLAlchemy Result methods and Session.add are synchronous, unlike execute.
    return MagicMock(spec=AsyncSession)


@pytest.fixture
def result_factory():
    def make_result(scalar=None, rows=()):
        result = MagicMock()
        result.scalar.return_value = scalar
        result.scalar_one_or_none.return_value = scalar
        result.scalars.return_value.first.return_value = scalar
        result.scalars.return_value.all.return_value = list(rows)
        result.unique.return_value = result
        result.all.return_value = list(rows)
        result.fetchall.return_value = list(rows)
        return result
    return make_result


@pytest.fixture
def player():
    return models.Player(id=1, name="Alice", is_guest=False)


@pytest.fixture
def tournament_data():
    counts = {1: 1, 2: 1, 3: 2, 5: 1, 6: 1, 7: 2}
    return schemas.TournamentCreate(
        id="official_20261024", date=date(2026, 10, 24),
        ranks=[schemas.RankGroupCreate(
            rank=index, rating=rating,
            players=[f"Player {rating}-{i}" for i in range(count)],
        ) for index, (rating, count) in enumerate(counts.items(), 1)],
    )


@pytest.fixture
def app(db_session):
    # ASGITransport does not run lifespan: startup DDL is tested separately.
    from main import app as application

    async def override_db():
        yield db_session

    previous = application.dependency_overrides.copy()
    application.dependency_overrides[database.get_db] = override_db
    yield application
    application.dependency_overrides.clear()
    application.dependency_overrides.update(previous)


@pytest.fixture
async def client(app):
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as http_client:
        yield http_client


@pytest.fixture
def mock_http(monkeypatch):
    """Mock outbound HTTP only; retain real ASGI clients created by the fixture."""
    from ranking import api
    client = AsyncMock(spec=httpx.AsyncClient)
    client.__aenter__.return_value = client
    monkeypatch.setattr(api.httpx, "AsyncClient", MagicMock(return_value=client))
    return client
