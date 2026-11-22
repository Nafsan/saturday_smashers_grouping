"""Exercise Google's maintained verifier with synthetic, locally signed tokens."""
import json
import time
from unittest.mock import Mock

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from google.auth import crypt, jwt
from google.auth.exceptions import GoogleAuthError
from google.oauth2 import id_token

@pytest.fixture
def token_factory():
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
    public = key.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo).decode()
    signer = crypt.RSASigner.from_string(private, key_id='test-key')
    response = Mock(status=200, data=json.dumps({'test-key':public}).encode())
    request = Mock(return_value=response)
    def make(**overrides):
        now = int(time.time())
        claims = {'iss':'https://accounts.google.com','aud':'test-client','sub':'stable-sub','iat':now,'exp':now+600}
        claims.update(overrides)
        return jwt.encode(signer, claims)
    return make, request

def test_google_verifier_accepts_signed_identity(token_factory):
    make, request = token_factory
    claims = id_token.verify_oauth2_token(make(), request, 'test-client')
    assert claims['sub'] == 'stable-sub'

@pytest.mark.parametrize('overrides', [
    {'aud':'wrong-client'}, {'iss':'https://evil.example'}, {'exp':1},
])
def test_google_verifier_rejects_invalid_audience_issuer_or_expiry(token_factory, overrides):
    make, request = token_factory
    with pytest.raises((ValueError, GoogleAuthError)):
        id_token.verify_oauth2_token(make(**overrides), request, 'test-client')

def test_google_verifier_rejects_malformed_or_modified_signature(token_factory):
    make, request = token_factory
    with pytest.raises((ValueError, GoogleAuthError)):
        id_token.verify_oauth2_token('not-a-jwt', request, 'test-client')
    token = make()
    header, payload, signature = token.split(b'.')
    replacement = b'A' if signature[:1] != b'A' else b'B'
    with pytest.raises((ValueError, GoogleAuthError)):
        id_token.verify_oauth2_token(b'.'.join([header, payload, replacement + signature[1:]]), request, 'test-client')
