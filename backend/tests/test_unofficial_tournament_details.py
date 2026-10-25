"""Run with: python -m unittest discover -s backend/tests -v"""
import sys
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import httpx
import pytest
from fastapi import FastAPI, HTTPException
from database import ADMIN_PASSWORD, get_db
import models
import schemas
from tournament.api import router
from tournament.services import validate_tournament_rules

pytestmark = pytest.mark.api


class UnofficialTournamentDetailsTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.tournament = models.Tournament(
            id='unofficial_20261024', date=date(2026, 10, 24), is_official=False,
            playlist_url='https://www.youtube.com/playlist?list=original',
            embed_url='existing video', description='Original notes', rank_groups=[],
        )
        self.session = AsyncMock()
        self.result = MagicMock()
        self.result.scalar.return_value = self.tournament
        self.result.scalars.return_value.all.return_value = [self.tournament]
        self.session.execute.return_value = self.result
        app = FastAPI()
        app.include_router(router)

        async def override_db():
            yield self.session

        app.dependency_overrides[get_db] = override_db
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test')
        self.url = f'/history/{self.tournament.id}/unofficial-details'

    async def asyncTearDown(self):
        await self.client.aclose()

    async def patch(self, payload, password=ADMIN_PASSWORD):
        return await self.client.patch(self.url, params={'password': password}, json=payload)

    async def test_save_and_read_notes_without_results_or_ranking_changes(self):
        notes = '## Round robin\n\n**Winner:** Alice\n\n1. Alice\n2. Bob'
        response = await self.patch({'playlist_url': 'https://www.youtube.com/playlist?list=friendly', 'description': notes})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['description'], notes)
        history = (await self.client.get('/history')).json()
        self.assertEqual(history[0]['description'], notes)
        self.assertEqual(history[0]['playlist_url'], 'https://www.youtube.com/playlist?list=friendly')
        self.assertFalse(history[0]['is_official'])
        self.assertEqual(history[0]['ranks'], [])
        self.assertEqual(history[0]['date'], '2026-10-24')
        self.assertEqual(history[0]['embed_url'], 'existing video')
        self.session.commit.assert_awaited_once()
        self.session.delete.assert_not_awaited()
        self.session.add.assert_not_called()

    async def test_requires_admin_password(self):
        self.assertEqual((await self.patch({'description': 'notes'}, password='wrong')).status_code, 403)
        self.session.execute.assert_not_awaited()

    async def test_rejects_official_tournaments(self):
        self.tournament.is_official = True
        self.assertEqual((await self.patch({'description': 'notes'})).status_code, 400)
        self.session.commit.assert_not_awaited()

    async def test_missing_tournament(self):
        self.result.scalar.return_value = None
        self.assertEqual((await self.patch({'description': 'notes'})).status_code, 404)

    async def test_rejects_invalid_playlist_urls(self):
        for url in ['javascript:alert(1)', 'https://example.com/?list=abc', 'https://youtube.com.evil.test/?list=abc', 'https://youtube.com/playlist?list=', 'ftp://youtube.com/playlist?list=abc', 'https://youtube.com/watch?v=abc']:
            with self.subTest(url=url):
                self.assertEqual((await self.patch({'playlist_url': url})).status_code, 422)
        self.session.commit.assert_not_awaited()

    async def test_playlist_length_limit(self):
        self.assertEqual((await self.patch({'playlist_url': 'https://youtube.com/playlist?list=' + 'a' * 500})).status_code, 422)

    async def test_rejects_ranking_and_official_status_updates(self):
        for field, value in [('is_official', True), ('ranks', [])]:
            with self.subTest(field=field):
                self.assertEqual((await self.patch({field: value})).status_code, 422)
        self.session.commit.assert_not_awaited()

    async def test_partial_update_preserves_playlist(self):
        response = await self.patch({'description': 'New notes'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['playlist_url'], 'https://www.youtube.com/playlist?list=original')

    async def test_can_clear_optional_details(self):
        response = await self.patch({'playlist_url': '  ', 'description': None})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'playlist_url': None, 'description': None})

    async def test_official_results_still_require_brackets(self):
        tournament = schemas.TournamentCreate(id='official', date=date(2026, 10, 24), ranks=[])
        with self.assertRaises(HTTPException) as error:
            validate_tournament_rules(tournament)
        self.assertEqual(error.exception.status_code, 400)


if __name__ == '__main__':
    unittest.main()
