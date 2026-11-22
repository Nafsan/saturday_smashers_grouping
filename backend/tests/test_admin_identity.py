"""Authorization policy for claims already verified by Google token validation."""
import pytest

from admin_identity import approved_identity


def test_approved_gmail_matches_allowlist_case_insensitively():
    claims = {"sub": "google-id", "email": "Admin@Gmail.com", "email_verified": True}
    assert approved_identity(claims, {"admin@gmail.com"}) == ("google-id", "admin@gmail.com")


@pytest.mark.parametrize("claims", [
    {"sub": "id", "email": "other@gmail.com", "email_verified": True},
    {"sub": "id", "email": "admin@gmail.com", "email_verified": False},
    {"sub": "", "email": "admin@gmail.com", "email_verified": True},
    {"sub": "id", "email": "admin@gmail.com", "email_verified": "true"},
    {"sub": "id", "email": "admin@example.com", "email_verified": True},
    {},
])
def test_unapproved_or_untrusted_identity_is_rejected(claims):
    assert approved_identity(claims, {"admin@gmail.com", "admin@example.com"}) is None


def test_workspace_email_requires_matching_hosted_domain():
    claims = {"sub": "id", "email": "admin@example.com", "email_verified": True, "hd": "example.com"}
    assert approved_identity(claims, {"admin@example.com"}) == ("id", "admin@example.com")
    claims["hd"] = "other.com"
    assert approved_identity(claims, {"admin@example.com"}) is None

@pytest.mark.parametrize("hosted_domain", [None, 123, [], {}])
def test_malformed_hosted_domain_is_rejected(hosted_domain):
    claims = {"sub": "id", "email": "admin@example.com", "email_verified": True, "hd": hosted_domain}
    assert approved_identity(claims, {"admin@example.com"}) is None
