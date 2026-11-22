"""Session enforcement replaces the leaked query credential on all writes."""
import pytest
from unittest.mock import AsyncMock
from test_api import WRITES

@pytest.mark.parametrize('method,path,payload', WRITES)
async def test_write_rejects_legacy_password(method, path, payload, client, db_session):
    separator = '&' if '?' in path else '?'
    response = await client.request(method, f'{path}{separator}password=pytest-admin-only', json=payload)
    assert response.status_code == 401
    db_session.commit.assert_not_awaited()

async def test_session_write_rejects_cross_origin(client, monkeypatch):
    from types import SimpleNamespace
    import admin_auth
    monkeypatch.setenv('FRONTEND_ORIGIN', 'https://example.test')
    monkeypatch.setattr(admin_auth, 'authenticate_session', AsyncMock(return_value=SimpleNamespace(active=True)))
    response = await client.post('/players', headers={'Origin': 'https://evil.test'}, cookies={'ss_session': 'valid'}, json={'name': 'Alice'})
    assert response.status_code == 403
