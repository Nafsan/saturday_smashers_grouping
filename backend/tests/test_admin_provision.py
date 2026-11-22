from unittest.mock import AsyncMock, MagicMock
import pytest
from admin_provision import provision_admin

async def test_provisions_normalized_email_without_binding_subject():
    db = MagicMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=result)
    db.commit = AsyncMock()
    assert await provision_admin(db, ' Admin@Gmail.com ') is True
    account = db.add.call_args.args[0]
    assert account.email == 'admin@gmail.com'
    assert account.google_sub is None
    db.commit.assert_awaited_once()

async def test_existing_account_is_not_reactivated_or_rebound():
    db = MagicMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = MagicMock(active=False, google_sub='existing')
    db.execute = AsyncMock(return_value=result)
    db.commit = AsyncMock()
    assert await provision_admin(db, 'admin@gmail.com') is False
    db.add.assert_not_called()
    db.commit.assert_not_awaited()

@pytest.mark.parametrize('email', ['', 'bad', '@gmail.com', 'name@', 'x@@gmail.com'])
async def test_invalid_email_rejected(email):
    with pytest.raises(ValueError):
        await provision_admin(MagicMock(), email)
