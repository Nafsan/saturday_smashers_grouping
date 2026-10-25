"""Player editing API regression tests; no database connection required."""
import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import httpx
from fastapi import FastAPI
from sqlalchemy.exc import IntegrityError
from database import ADMIN_PASSWORD, get_db
import models
from player.api import router


class PlayerUpdateTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.player = models.Player(id=1, name='Alice', is_guest=False)
        self.player.fund = models.PlayerFund(player_id=1, current_balance=250, days_played=5)
        self.player.rank_groups = [models.RankGroup(id=10, tournament_id='official', rank=1, rating=1)]
        self.session = AsyncMock()
        self.player_result = MagicMock()
        self.player_result.scalar.return_value = self.player
        self.player_result.scalars.return_value.all.return_value = [self.player]
        self.duplicate_result = MagicMock()
        self.duplicate_result.scalar.return_value = None
        self.session.execute.side_effect = [self.player_result, self.duplicate_result]
        app = FastAPI()
        app.include_router(router)

        async def override_db():
            yield self.session

        app.dependency_overrides[get_db] = override_db
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test')

    async def asyncTearDown(self):
        await self.client.aclose()

    async def update(self, payload, password=ADMIN_PASSWORD):
        return await self.client.put('/players/1', params={'password': password}, json=payload)

    async def test_rename_preserves_identity_funds_history_and_guest_status(self):
        fund = self.player.fund
        rank = self.player.rank_groups[0]
        response = await self.update({'name': '  Zara  '})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'id': 1, 'name': 'Zara', 'is_guest': False})
        self.assertIs(self.player.fund, fund)
        self.assertEqual(fund.current_balance, 250)
        self.assertEqual(fund.days_played, 5)
        self.assertIs(self.player.rank_groups[0], rank)
        self.assertEqual(rank.players[0].id, 1)
        self.session.commit.assert_awaited_once()
        self.session.add.assert_not_called()
        self.session.delete.assert_not_awaited()
        self.session.execute.side_effect = [self.player_result]
        self.assertEqual((await self.client.get('/players')).json()[0]['name'], 'Zara')

    async def test_guest_only_update_remains_supported(self):
        response = await self.update({'is_guest': True})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'id': 1, 'name': 'Alice', 'is_guest': True})
        self.session.execute.assert_awaited_once()

    async def test_name_and_guest_status_can_be_updated_together(self):
        self.assertEqual((await self.update({'name': 'Zara', 'is_guest': True})).json(), {'id': 1, 'name': 'Zara', 'is_guest': True})

    async def test_duplicate_name_is_rejected_without_changes(self):
        self.duplicate_result.scalar.return_value = models.Player(id=2, name='BOB', is_guest=True)
        response = await self.update({'name': 'bob', 'is_guest': True})
        self.assertEqual(response.status_code, 409)
        self.assertEqual(self.player.name, 'Alice')
        self.assertFalse(self.player.is_guest)
        self.session.commit.assert_not_awaited()
        duplicate_query = self.session.execute.await_args_list[1].args[0]
        self.assertIn('lower(players.name)', str(duplicate_query))
        self.assertIn('players.id !=', str(duplicate_query))

    async def test_case_only_name_change_is_allowed(self):
        response = await self.update({'name': 'ALICE'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['name'], 'ALICE')

    async def test_blank_or_null_names_are_rejected(self):
        for value in ['', '   ', None]:
            with self.subTest(name=value):
                self.assertEqual((await self.update({'name': value})).status_code, 422)
        self.session.commit.assert_not_awaited()

    async def test_empty_update_and_null_guest_status_are_rejected(self):
        self.assertEqual((await self.update({})).status_code, 400)
        self.assertEqual((await self.update({'is_guest': None})).status_code, 422)
        self.session.commit.assert_not_awaited()

    async def test_requires_admin_password(self):
        self.assertEqual((await self.update({'name': 'Zara'}, password='wrong')).status_code, 403)
        self.session.execute.assert_not_awaited()

    async def test_missing_player_returns_not_found(self):
        self.player_result.scalar.return_value = None
        self.assertEqual((await self.update({'name': 'Zara'})).status_code, 404)

    async def test_concurrent_duplicate_rolls_back_with_readable_error(self):
        self.session.commit.side_effect = IntegrityError('update players', {}, Exception('duplicate'))
        response = await self.update({'name': 'Zara'})
        self.assertEqual(response.status_code, 409)
        self.assertIn('already exists', response.json()['detail'])
        self.session.rollback.assert_awaited_once()


if __name__ == '__main__':
    unittest.main()
