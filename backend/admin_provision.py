"""Provision an initial admin via a trusted operator with database access.

Run from the backend directory: python admin_provision.py admin@example.com
This command never reactivates or changes a previously enrolled account.
"""
import asyncio
import re
import sys
from sqlalchemy import select
from admin_sessions import AdminAccount
from database import AsyncSessionLocal

_EMAIL = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')

async def provision_admin(db, email):
    email = email.strip().lower()
    if len(email) > 320 or not _EMAIL.fullmatch(email):
        raise ValueError('Invalid email address')
    result = await db.execute(select(AdminAccount).where(AdminAccount.email == email))
    if result.scalar_one_or_none() is not None:
        return False
    db.add(AdminAccount(email=email, active=True))
    await db.commit()
    return True

async def main(email):
    async with AsyncSessionLocal() as db:
        created = await provision_admin(db, email)
    print('Account added' if created else 'Account already exists; no changes made')

if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Usage: python admin_provision.py EMAIL')
    asyncio.run(main(sys.argv[1]))
