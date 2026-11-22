from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from admin_sessions import create_session, authenticate_session, revoke_session

NOW = datetime(2026, 1, 1, tzinfo=timezone.utc)

@pytest.mark.asyncio
async def test_create_stores_only_hash_and_expiry():
    db = MagicMock()
    db.commit = AsyncMock()
    token = await create_session(db, 7, now=NOW)
    record = db.add.call_args.args[0]
    assert token and token != record.token_hash
    assert record.admin_id == 7
    assert record.expires_at == NOW + timedelta(hours=8)
    db.commit.assert_awaited_once()

@pytest.mark.asyncio
async def test_authentication_requires_live_session_and_active_admin():
    db = MagicMock()
    record = MagicMock(expires_at=NOW + timedelta(seconds=1), revoked_at=None)
    admin = MagicMock(active=True)
    db.execute = AsyncMock(return_value=MagicMock())
    db.execute.return_value.one_or_none.return_value = (record, admin)
    assert await authenticate_session(db, 'token', now=NOW) is admin
    admin.active = False
    assert await authenticate_session(db, 'token', now=NOW) is None
    admin.active = True
    record.expires_at = NOW
    assert await authenticate_session(db, 'token', now=NOW) is None
    record.expires_at = NOW + timedelta(seconds=1)
    record.revoked_at = NOW
    assert await authenticate_session(db, 'token', now=NOW) is None
    db.execute.return_value.one_or_none.return_value = None
    assert await authenticate_session(db, 'token', now=NOW) is None
    assert await authenticate_session(db, '', now=NOW) is None

@pytest.mark.asyncio
async def test_revoke_marks_session_and_commits():
    db = MagicMock()
    db.execute = AsyncMock(return_value=MagicMock())
    db.commit = AsyncMock()
    record = MagicMock(revoked_at=None)
    db.execute.return_value.scalar_one_or_none.return_value = record
    await revoke_session(db, 'token', now=NOW)
    assert record.revoked_at == NOW
    db.commit.assert_awaited_once()
