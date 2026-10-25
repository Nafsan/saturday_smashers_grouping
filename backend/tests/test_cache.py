"""TTL cache tests use a controlled clock, with no real sleeps."""
from unittest.mock import MagicMock

import pytest
from club_tournament.cache import SimpleCache

pytestmark = pytest.mark.unit


def test_cache_expiry_boundary_and_removal(monkeypatch):
    clock = MagicMock(return_value=100)
    monkeypatch.setattr("club_tournament.cache.time.time", clock)
    cache = SimpleCache(ttl=10)
    cache.set("key", {"items": [1]})
    clock.return_value = 109.999
    assert cache.get("key") == {"items": [1]}
    clock.return_value = 110
    assert cache.get("key") is None
    assert "key" not in cache._cache


def test_cache_overwrite_missing_and_clear():
    cache = SimpleCache()
    assert cache.get("missing") is None
    cache.set("key", "first")
    cache.set("key", "second")
    assert cache.get("key") == "second"
    cache.clear()
    assert cache.get("key") is None
