"""Persistence primitives for future admin authentication integration.

Tokens are returned once and only their SHA-256 digests are persisted. These
helpers do not by themselves protect routes or implement Google sign-in.
"""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, select
from database import Base


class AdminAccount(Base):
    __tablename__ = "admin_accounts"

    id = Column(Integer, primary_key=True)
    email = Column(String(320), nullable=False, unique=True)
    google_sub = Column(String(255), unique=True, nullable=True)
    active = Column(Boolean, nullable=False, default=True)


class AdminSession(Base):
    __tablename__ = "admin_sessions"

    token_hash = Column(String(64), primary_key=True)
    admin_id = Column(Integer, ForeignKey("admin_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)


def _digest(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def create_session(db, admin_id, *, now=None):
    now = now or datetime.now(timezone.utc)
    token = secrets.token_urlsafe(32)
    db.add(AdminSession(token_hash=_digest(token), admin_id=admin_id,
                        expires_at=now + timedelta(hours=8)))
    await db.commit()
    return token


async def authenticate_session(db, token, *, now=None):
    if not isinstance(token, str) or not token or len(token) > 512:
        return None
    now = now or datetime.now(timezone.utc)
    result = await db.execute(
        select(AdminSession, AdminAccount)
        .join(AdminAccount, AdminSession.admin_id == AdminAccount.id)
        .where(AdminSession.token_hash == _digest(token))
    )
    row = result.one_or_none()
    if row is None:
        return None
    session, admin = row
    if session.revoked_at is not None or session.expires_at <= now or not admin.active:
        return None
    return admin


async def revoke_session(db, token, *, now=None):
    if not isinstance(token, str) or not token or len(token) > 512:
        return
    result = await db.execute(select(AdminSession).where(AdminSession.token_hash == _digest(token)))
    session = result.scalar_one_or_none()
    if session is not None and session.revoked_at is None:
        session.revoked_at = now or datetime.now(timezone.utc)
        await db.commit()
