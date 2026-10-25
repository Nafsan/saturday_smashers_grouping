# Frontend unit testing plan and workflow

## Implemented infrastructure

Jest runs the React/Vite application in jsdom with React Testing Library and
user-event. Babel handles ES modules, JSX, dynamic imports, and Vite
`import.meta.env` expressions **in the test environment only**. CSS/SCSS and static
assets are mapped to test stubs; Vite continues to build the production app.
Use Node 22 and `npm ci` from the repository root. No backend server, `.env`,
production password, or external API account is required.

`AGENTS.md` and `src/AGENTS.md` make test-first development, companion tests, and
running the changed file's tests part of the repository working agreement.

## Commands

All commands run in `D:\pet_project\saturday_smashers_grouping` (the repository root).

| Task | Command |
| --- | --- |
| Full frontend suite without coverage | `npm test` or `npm run test:frontend` |
| Interactive watch mode | `npm run test:frontend:watch` |
| One changed file and tests that import it | `npm run test:frontend:related -- src/components/ManagePlayers.jsx` |
| All unstaged, staged, and untracked frontend changes | `npm run test:frontend:changed` |
| Require companion tests and check each changed module's coverage | `npm run test:frontend:check` |
| All branch changes since a Git base, plus local edits | `npm run test:frontend:check -- origin/main` |
| Full suite and baseline coverage gates | `npm run test:frontend:coverage` |
| Migrated player state regressions and management UI | `npm run test:players` |
| Production compilation | `npm run build` |

The positional Git ref works in PowerShell and npm on Windows. The equivalent
direct invocation is `node scripts/test-frontend.mjs check --base origin/main`.
The default base is `HEAD`, so a clean checkout has no **uncommitted** changes;
choose a base ref to include committed branch changes. The runner compares the
merge base with the final working tree and includes untracked files. It fails on
missing/invalid refs instead of reporting a successful empty run.

For direct Jest flags, use `node node_modules/jest/bin/jest.js --runInBand --verbose
--runTestsByPath src/logic/ranking.test.js`. Default Jest output reports suites;
`--verbose` also lists individual test names. Some npm/PowerShell versions consume
named flags when forwarding them, so the scripts provide common options directly.

## Test-first development for every frontend change

1. Add/update `Name.test.js` or `Name.test.jsx` beside `Name.js`/`Name.jsx`. Write a
   test demonstrating the desired behavior and run it to observe the intended
   failure before changing implementation.
2. Implement the smallest behavior change, then run
   `npm run test:frontend:related -- src/path/Name.jsx` after each edit/fix.
3. Run `npm run test:frontend:check` before handing off the change. Every changed
   executable application file requires its own companion test and must achieve
   80% statements/functions/lines and 70% branches **individually**. An untested
   legacy file must gain tests when changed. Empty tests and tests that only
   import a module do not satisfy the coverage gate.
4. For shared dependencies, infrastructure, application entry points, data,
   global styles, or broad refactors, run the full coverage suite and production
   build. Global changes run the full suite automatically in the changed runner.
5. Report the commands and results. Do not bypass failures or lower a threshold
   to make a change pass. CI runs the complete suite in addition to changed-file
   checks, so indirectly affected behavior is checked too.

Related-file selection follows Jest's import graph. A local component stylesheet
also selects its same-name component, because stylesheet mocking can otherwise
hide that dependency. Deleted files trigger the full suite. CSS-only changes use
component behavior tests and a browser visual review for appearance; jsdom does
not verify layout. Tests for reusable test tooling live in `tests/tooling`.

## Existing-code rollout

This is an initial baseline, not a claim that every legacy screen is covered.
Coverage reports include **all** executable files in `src`, including untested
screens. The first run measured about 20% application line coverage, while the
logic, utilities, API client, and Redux state are nearly fully covered. Each
subsequent feature must increase or preserve coverage for the files it changes.

| Phase | Scope | Status / acceptance |
| --- | --- | --- |
| 1 | Jest/jsdom/Babel, offline setup, reusable providers, commands, policy tests, CI | Implemented |
| 2 | Grouping, knockout structures, rank weighting/ties, text/HTML parsers, cookies, YouTube and club-result utilities | Implemented; core logic/utilities have explicit coverage gates |
| 3 | API method/path/payload/error contracts; real Redux reducers and async thunks; migrate existing player regressions | Implemented; API/state have explicit coverage gates |
| 4 | Player management, login/password, unofficial notes, date ranges, video controls, theme, notifications, hero actions | Initial behavior suites implemented; each covered module has a coverage gate |
| 5 | Fund forms/reports, club venues/results/imports, ranking submission and fixture/scoresheet editors | Add suites feature by feature; validate loading, input rules, permissions, success, failure, retry and cancellation |
| 6 | Charts/analytics, national rankings, ELO UI, exports/sharing, application routing/lazy loading | Add interaction tests and extract calculation logic into tested modules where helpful |
| 7 | Browser integration | Separate end-to-end tests for real routing, layout, canvas/image/PDF export, downloads and sharing |

The full suite protects the established baseline with coverage thresholds for
logic/utilities/API/state and the tested UI modules. Future changed-file checks
apply thresholds to new/touched modules, including modules outside that baseline.
This avoids hiding legacy gaps by excluding files from coverage.

## Conventions and isolation

- Name tests `Module.test.js`/`Component.test.jsx` in the same directory as the
  implementation. Jest also runs the migrated `tests/playerManagement.test.js`.
- Prefer observable behavior and accessible roles, labels and text. Test primary
  actions plus realistic errors; avoid large snapshots and internal state checks.
- `tests/frontend/renderWithProviders.jsx` creates a fresh real Redux store and
  optional real ToastProvider for each render. Mock API modules at the boundary;
  do not mock the reducer under test.
- `tests/frontend/setup.js` supplies dummy env values, matchMedia, DOM cleanup,
  cookie/timer cleanup, and network guards. Tests must explicitly mock fetch or
  the API client. Expected errors may use scoped console spies; never silence all
  application errors globally.
- Heavy third-party editor/Markdown widgets are mocked only at their value/render
  boundary in dialog unit tests. Their rendering and browser integration need
  separate integration tests. MUI, Redux and the application behavior stay real.
- Freeze clocks for calendar/ranking tests and inject/control random values for
  grouping invariants. Do not sleep or rely on live timestamps or remote data.
- Coverage artifacts are under `coverage/frontend` and ignored by Git. Open
  `coverage/frontend/index.html` for the complete report. The backend's
  `coverage.xml` and pytest commands remain separate.
- Jest uses a unique temporary cache directory, avoiding permission conflicts
  with folders created under a different Windows security context.

## CI

`.github/workflows/frontend-tests.yml` installs the lockfile using Node 22, runs
the full suite/coverage, checks companion tests and per-file coverage against the
push/PR base, builds production assets, and uploads coverage artifacts. No
repository secrets are used for tests. The deployment workflow also runs the
baseline coverage suite before building/publishing. Require the Frontend tests
check in GitHub branch protection to make it mandatory before merging.
