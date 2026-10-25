# Frontend testing requirements

These rules apply to every frontend change, including utilities, API wrappers,
Redux state, components, hooks, and application entry points.

1. Before changing behavior, add or update a colocated `Name.test.js` or
   `Name.test.jsx` and observe the intended test failure. New executable
   application modules require their own companion test in the same directory.
2. After **every frontend change**, run the changed file's tests and affected
   consumers with `npm run test:frontend:related -- src/path/Name.jsx` or run
   `npm run test:frontend:changed` for all uncommitted frontend changes. Repeat
   this after a fix; an earlier green result does not validate later edits.
3. Before completing work, run `npm run test:frontend:check`. This checks companion
   tests, runs related tests, and requires at least 80% statements, functions,
   and lines and 70% branches for **each changed executable application file**.
   Existing untested files must gain tests when touched. Deleted modules do not
   need companion tests; their affected consumers must still be tested.
4. Shared infrastructure, dependency, entry-point, global style, and broad
   refactors require `npm run test:frontend:coverage` and `npm run build` too.
   CSS-only changes use the associated component tests and require visual review
   when appearance changes. Tests cannot verify real layout in jsdom.
5. Use React Testing Library and user-event to test visible behavior, accessible
   roles/labels, user input, validation, loading, success, and failure states.
   Use a fresh Redux store for each test. Prefer real reducers/providers.
6. Mock API boundaries and browser-only capabilities. Unit tests must never call
   real backend/YouTube services, read `.env`, or depend on production passwords.
   Control dates/randomness where needed and restore spies/timers after each test.
7. Do not replace application logic with mocks merely to improve coverage. Avoid
   snapshots of large component trees, assertions on internal component state,
   arbitrary sleeps, and test-only production behavior.
8. When a fix changes a shared dependency, run tests for that dependency and its
   consumers. A changed-file run is fast feedback; CI also runs the full suite.

Commands run from the repository root. See `docs/frontend-testing.md` for the
baseline plan, CI, explicit file selection, and branch/base comparisons.
