# Backend testing

Run commands from the **repository root** using Python 3.9 or newer. The suite uses
pytest, pytest-asyncio, and pytest-cov. Test dependencies are separate from the
production requirements.

```powershell
# Windows: use the repository's existing virtual environment, or create it first.
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
.\venv\Scripts\python.exe -m pytest
```

```bash
# Linux/macOS
python -m venv venv
venv/bin/python -m pip install -r backend/requirements-dev.txt
venv/bin/python -m pytest
```

If your environment is already activated, use `python -m pytest` below.
Use the same Python interpreter for installation and testing. On Windows, activate
the project environment with `.\venv\Scripts\Activate.ps1`, or continue using
`.\venv\Scripts\python.exe` explicitly. If `python -m pytest` says
`No module named pytest`, that interpreter does not have the test dependencies;
install them with that same interpreter or activate the environment that does.

## Daily workflow

```bash
# Entire backend suite, including coverage and the 80% minimum
python -m pytest

# Quick run of the complete backend suite, without coverage
python -m pytest -q --no-cov
# Equivalent npm shortcuts (activate your Python environment first)
npm run test:backend
npm run test:backend:coverage

# Fast feedback while writing a test (without the whole-suite coverage gate)
python -m pytest backend/tests/test_fund_services.py -q --no-cov
python -m pytest -k payment -q --no-cov

# Run isolated units or HTTP contracts separately
python -m pytest -m unit --no-cov
python -m pytest -m api --no-cov

# Inspect the exact files/tests collected, without executing them
python -m pytest --collect-only -q --no-cov

# Generate a browsable coverage report
python -m pytest --cov-report=html
```

Coverage measures lines **and branches** across the backend runtime: services,
routers, application setup, database configuration, models, and request/response
schemas. It excludes tests and standalone migrations/diagnostics. The default
command writes `coverage.xml`; HTML output goes to `htmlcov/index.html`. Generated
reports are ignored by Git. The coverage threshold applies to the complete suite;
use `--no-cov` for focused runs.

Each run creates its own `saturday-smashers-pytest-*` directory directly in the
current process's writable temporary location and removes it on exit. It avoids
both shared `%TEMP%/pytest-of-<user>` folders and checkout cache folders that may
have been created under a different account or permission context. No changes to
existing folders' permissions are needed.
An explicit `--basetemp=PATH` takes precedence if you want to retain temporary
files for debugging; pytest owns and clears the specified directory.

## Test-driven development

1. Write a focused failing test for the requested behavior or reported defect.
   Check its failure describes the missing behavior rather than a broken fixture.
2. Make the smallest implementation change needed to pass that test.
3. Refactor while keeping the test green, then run the complete backend suite.
4. Include the tests with the implementation in the same pull request. Preserve
   the 80% coverage floor and add assertions for important error paths.

These tests establish a regression baseline for existing code. Future changes
should follow this test-first cycle; adding tests after existing code cannot
retroactively make its development test-driven.

## Suite layout

| File | Behavior covered |
| --- | --- |
| `tests/conftest.py` | Offline environment, async session/result mocks, factories, ASGI client, isolated caches |
| `tests/test_player_services.py` | Name validation, creation, statistics, insight metrics, AI responses and fallbacks, trophy output |
| `tests/test_player_updates.py` | Rename/guest API regressions, duplicate conflicts, rollback, linked history/fund preservation |
| `tests/test_tournament_services.py` | Bracket rules, create/update/delete, history, unofficial attendance and days played |
| `tests/test_unofficial_tournament_details.py` | Notes/playlist editing, URL validation, admin access, partial updates |
| `tests/test_fund_services.py` | Settings, seeding, filtering, cost sharing and saving, balance changes/reversals, payment transfers, expenses, pagination |
| `tests/test_club_tournament_services.py` | Venues, BDT status boundaries, serialization, filters, results, bulk imports |
| `tests/test_cache.py` | Cache expiry boundary, overwriting, clearing |
| `tests/test_ranking.py` | BTTF URL validation/cache/failure fallback, YouTube formats, deduplication, RSS fallback |
| `tests/test_api.py` | Every write route's admin requirement, HTTP validation/responses, routing, delegation, cache invalidation, CORS |
| `tests/test_application.py` | Health endpoints, mocked startup DDL/RLS, database URL normalization, session cleanup |

The original unittest regression classes remain runnable by pytest and are marked
`api`. New tests use pytest functions and fixtures; async tests run automatically.

## Isolation and writing tests

- No Supabase instance, local database, server process, or API token is required.
  `tests/conftest.py` sets dummy configuration before importing application code.
  It does not edit `.env` files. Outbound connection helpers and real SQLAlchemy
  engine/session entry points fail immediately if a test forgets to mock them.
- `db_session` uses the real `AsyncSession` interface: `execute`, `commit`, `flush`,
  `refresh`, `delete`, and `rollback` are async; `add` and SQLAlchemy result methods
  are synchronous. Use `result_factory(scalar=...)` or
  `result_factory(rows=[...])` for each expected query result.
- Assert outcomes such as balances, linked IDs, status codes and persistence
  boundaries. For rejected writes, also assert the database was not committed.
- Patch external HTTP/AI clients where the service imports them. Use synthetic
  response bodies, temporary cache files, and controlled clocks; do not use sleeps
  or live network calls. The `mock_http` fixture is for direct ranking function
  tests; use the separate `client` fixture for in-process HTTP requests.
- The ASGI client overrides `get_db` and does not run application lifespan.
  Startup is tested separately with a mocked engine, so test requests never
  execute production schema changes.
- `pytest.ini` limits default discovery to `backend/tests`. `backend/conftest.py`
  additionally ignores the manual `backend/test_*.py` and `scratch_test.py` scripts
  when someone explicitly collects the backend directory.

## CI and scope

`.github/workflows/backend-tests.yml` runs the suite on backend/configuration
pushes and pull requests using Python 3.9 and 3.13. It needs no repository secrets
or database service and uploads JUnit and coverage reports even when tests fail.
CI fails for failing tests or coverage below 80%. Branch protection must require
the workflow's checks if passing tests should be mandatory before merging.

These are unit tests and HTTP contract tests with mocked persistence. They do not
verify PostgreSQL execution, foreign keys, migrations, transaction isolation,
actual RLS permissions, live provider compatibility, or frontend/browser behavior.
Those need separate integration and end-to-end suites.

Existing response conventions are retained, including tournament `total_cost`
representing shared expenses while personal extras appear in player breakdowns,
and club status filtering occurring after pagination. Changing either contract
should start with a test for the newly intended behavior.

The backend currently emits Pydantic v1-API and `datetime.utcnow()` deprecation
warnings. These remain visible; the test setup does not suppress them globally.
