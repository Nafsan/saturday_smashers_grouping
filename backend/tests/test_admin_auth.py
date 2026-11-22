from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlsplit
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from admin_auth import login, callback, check_origin

@pytest.fixture
def settings(monkeypatch):
    for key, value in {'GOOGLE_CLIENT_ID':'client', 'GOOGLE_CLIENT_SECRET':'secret',
                       'GOOGLE_REDIRECT_URI':'https://example.test/api/auth/google/callback',
                       'FRONTEND_ORIGIN':'https://example.test'}.items():
        monkeypatch.setenv(key, value)

async def test_login_creates_pkce_and_browser_bound_state(settings):
    db = MagicMock()
    db.commit = AsyncMock()
    response = await login(db)
    params = parse_qs(urlsplit(response.headers['location']).query)
    attempt = db.add.call_args.args[0]
    assert params['code_challenge_method'] == ['S256']
    assert params['nonce'] == [attempt.nonce]
    assert params['state'][0] in response.headers['set-cookie']
    assert 'HttpOnly' in response.headers['set-cookie']
    assert attempt.state_hash != params['state'][0]
    db.commit.assert_awaited_once()

async def test_callback_rejects_state_mismatch_before_database(settings):
    request = Request({'type':'http', 'method':'GET', 'path':'/', 'query_string':b'state=wrong&code=x',
                       'headers':[(b'cookie', b'ss_oauth_state=expected')]})
    db = MagicMock()
    with pytest.raises(HTTPException) as error:
        await callback(request, db)
    assert error.value.status_code == 400
    db.execute.assert_not_called()

async def test_callback_rejects_expired_attempt(settings):
    request = Request({'type':'http', 'method':'GET', 'path':'/', 'query_string':b'state=state&code=x',
                       'headers':[(b'cookie', b'ss_oauth_state=state')]})
    db = MagicMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = MagicMock(expires_at=datetime.now(timezone.utc)-timedelta(seconds=1))
    db.execute = AsyncMock(return_value=result)
    with pytest.raises(HTTPException) as error:
        await callback(request, db)
    assert error.value.status_code == 400


def test_origin_must_match_configured_frontend(settings):
    request = Request({'type':'http', 'method':'POST', 'path':'/', 'headers':[(b'origin', b'https://evil.test')]})
    with pytest.raises(HTTPException) as error:
        check_origin(request)
    assert error.value.status_code == 403

async def test_callback_rejects_wrong_nonce_after_verification(settings, monkeypatch):
    import admin_auth
    request = Request({'type':'http', 'method':'GET', 'path':'/', 'query_string':b'state=state&code=x',
                       'headers':[(b'cookie', b'ss_oauth_state=state')]})
    attempt = MagicMock(expires_at=datetime.now(timezone.utc) + timedelta(minutes=1), nonce='expected', verifier='verifier')
    result = MagicMock()
    result.scalar_one_or_none.return_value = attempt
    db = MagicMock()
    db.execute = AsyncMock(return_value=result)
    db.delete = AsyncMock()
    db.commit = AsyncMock()
    response = MagicMock()
    response.json.return_value = {'id_token':'token'}
    client = MagicMock()
    client.post = AsyncMock(return_value=response)
    context = MagicMock()
    context.__aenter__ = AsyncMock(return_value=client)
    context.__aexit__ = AsyncMock(return_value=False)
    monkeypatch.setattr(admin_auth.httpx, 'AsyncClient', lambda **kwargs: context)
    monkeypatch.setattr(admin_auth, 'run_in_threadpool', AsyncMock(return_value={'nonce':'wrong'}))
    with pytest.raises(HTTPException) as error:
        await callback(request, db)
    assert error.value.status_code == 401
    db.delete.assert_awaited_once_with(attempt)

async def test_callback_query_is_removed_before_server_access_logging():
    from main import redact_oauth_callback_query
    scope = {'type':'http','method':'GET','path':'/auth/google/callback',
             'query_string':b'code=sensitive-code&state=sensitive-state','headers':[]}
    request = Request(scope)
    async def downstream(req):
        assert req.query_params['code'] == 'sensitive-code'
        return object()
    await redact_oauth_callback_query(request, downstream)
    assert scope['query_string'] == b''

async def test_callback_query_is_removed_even_when_downstream_raises():
    from main import redact_oauth_callback_query
    scope = {'type':'http','method':'GET','path':'/auth/google/callback','query_string':b'code=secret','headers':[]}
    async def downstream(_):
        raise RuntimeError('failure')
    with pytest.raises(RuntimeError):
        await redact_oauth_callback_query(Request(scope), downstream)
    assert scope['query_string'] == b''

async def test_other_request_queries_are_not_changed():
    from main import redact_oauth_callback_query
    scope = {'type':'http','method':'GET','path':'/players','query_string':b'page=2','headers':[]}
    await redact_oauth_callback_query(Request(scope), AsyncMock(return_value=object()))
    assert scope['query_string'] == b'page=2'
