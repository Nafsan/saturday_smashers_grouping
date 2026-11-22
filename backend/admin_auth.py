"""Google OIDC login and same-origin admin sessions."""
import base64
import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import id_token
from sqlalchemy import Column, DateTime, String, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from admin_identity import approved_identity
from admin_sessions import AdminAccount, authenticate_session, create_session, revoke_session
from database import Base, get_db

router = APIRouter(prefix='/auth', tags=['authentication'])
SESSION_COOKIE = 'ss_session'
STATE_COOKIE = 'ss_oauth_state'

class LoginAttempt(Base):
    __tablename__ = 'admin_login_attempts'
    state_hash = Column(String(64), primary_key=True)
    nonce = Column(String(128), nullable=False)
    verifier = Column(String(128), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)


def config():
    keys = ('GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI', 'FRONTEND_ORIGIN')
    values = {key: os.getenv(key, '').strip() for key in keys}
    if not all(values.values()):
        raise HTTPException(503, 'Admin authentication is not configured')
    return values


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def cookie_options():
    return {'httponly': True, 'secure': os.getenv('AUTH_COOKIE_SECURE', 'true').lower() == 'true',
            'samesite': 'lax', 'path': '/'}


def check_origin(request: Request):
    origin = os.getenv('FRONTEND_ORIGIN', '').strip().rstrip('/')
    if not origin or request.headers.get('origin') != origin:
        raise HTTPException(403, 'Invalid request origin')


async def require_admin(request: Request, db: AsyncSession = Depends(get_db)):
    token = request.cookies.get(SESSION_COOKIE)
    admin = await authenticate_session(db, token)
    if admin is None:
        raise HTTPException(401, 'Admin session required')
    if request.method not in ('GET', 'HEAD', 'OPTIONS'):
        check_origin(request)
    return admin


@router.get('/google/login')
async def login(db: AsyncSession = Depends(get_db)):
    settings = config()
    state, nonce, verifier = (secrets.token_urlsafe(32) for _ in range(3))
    db.add(LoginAttempt(state_hash=digest(state), nonce=nonce, verifier=verifier,
                        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10)))
    await db.commit()
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b'=').decode()
    query = urlencode({'client_id': settings['GOOGLE_CLIENT_ID'], 'redirect_uri': settings['GOOGLE_REDIRECT_URI'],
                       'response_type': 'code', 'scope': 'openid email', 'state': state, 'nonce': nonce,
                       'code_challenge': challenge, 'code_challenge_method': 'S256'})
    response = RedirectResponse('https://accounts.google.com/o/oauth2/v2/auth?' + query, status_code=302)
    response.set_cookie(STATE_COOKIE, state, max_age=600, **cookie_options())
    return response


@router.get('/google/callback')
async def callback(request: Request, db: AsyncSession = Depends(get_db)):
    settings = config()
    state = request.query_params.get('state', '')
    code = request.query_params.get('code', '')
    cookie = request.cookies.get(STATE_COOKIE, '')
    if not state or len(state) > 128 or not cookie or not secrets.compare_digest(state, cookie):
        raise HTTPException(400, 'Invalid login state')
    result = await db.execute(select(LoginAttempt).where(LoginAttempt.state_hash == digest(state)).with_for_update())
    attempt = result.scalar_one_or_none()
    if attempt is None or attempt.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(400, 'Login attempt expired')
    nonce, verifier = attempt.nonce, attempt.verifier
    await db.delete(attempt)
    await db.commit()
    if not code:
        raise HTTPException(400, 'Google sign-in was cancelled')
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            token_response = await client.post('https://oauth2.googleapis.com/token', data={
                'code': code, 'client_id': settings['GOOGLE_CLIENT_ID'],
                'client_secret': settings['GOOGLE_CLIENT_SECRET'], 'redirect_uri': settings['GOOGLE_REDIRECT_URI'],
                'grant_type': 'authorization_code', 'code_verifier': verifier})
            token_response.raise_for_status()
            raw_token = token_response.json()['id_token']
        claims = await run_in_threadpool(id_token.verify_oauth2_token, raw_token, GoogleRequest(), settings['GOOGLE_CLIENT_ID'])
    except Exception:
        raise HTTPException(401, 'Google identity verification failed') from None
    if claims.get('nonce') != nonce:
        raise HTTPException(401, 'Invalid identity nonce')
    email = claims.get('email')
    if not isinstance(email, str):
        raise HTTPException(403, 'Account is not authorized')
    result = await db.execute(select(AdminAccount).where(AdminAccount.email == email.lower()).with_for_update())
    admin = result.scalar_one_or_none()
    identity = approved_identity(claims, {email})
    if admin is None or not admin.active or identity is None or (admin.google_sub and admin.google_sub != identity[0]):
        raise HTTPException(403, 'Account is not authorized')
    if admin.google_sub is None:
        admin.google_sub = identity[0]
        await db.commit()
    token = await create_session(db, admin.id)
    response = RedirectResponse(settings['FRONTEND_ORIGIN'].rstrip('/') + '/?auth=success', status_code=303)
    response.delete_cookie(STATE_COOKIE, **cookie_options())
    response.set_cookie(SESSION_COOKIE, token, max_age=8 * 3600, **cookie_options())
    return response


@router.get('/session')
async def session(admin: AdminAccount = Depends(require_admin)):
    return {'authenticated': True, 'email': admin.email}


@router.post('/logout')
async def logout(request: Request, db: AsyncSession = Depends(get_db)):
    check_origin(request)
    await revoke_session(db, request.cookies.get(SESSION_COOKIE))
    response = RedirectResponse('/', status_code=303)
    response.delete_cookie(SESSION_COOKIE, **cookie_options())
    return response
