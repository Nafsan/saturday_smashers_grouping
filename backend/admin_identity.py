"""Decide whether a cryptographically verified Google identity may enroll.

This policy does not validate token signatures or other OpenID Connect claims;
callers must validate the ID token before calling it.
"""


def approved_identity(claims, allowed_emails):
    subject = claims.get("sub")
    email = claims.get("email")
    if not isinstance(subject, str) or not subject or not isinstance(email, str):
        return None
    if claims.get("email_verified") is not True:
        return None
    email = email.lower()
    if email not in {value.strip().lower() for value in allowed_emails}:
        return None
    local, separator, domain = email.rpartition("@")
    if not separator or not local or not domain:
        return None
    hosted_domain = claims.get("hd")
    if domain != "gmail.com" and (not isinstance(hosted_domain, str) or hosted_domain.lower() != domain):
        return None
    return subject, email
