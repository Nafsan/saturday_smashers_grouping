# Repository working agreement

- Use test-driven development for behavior changes: write a focused failing test,
  implement the smallest fix, then refactor with passing tests.
- Frontend rules and commands are in `src/AGENTS.md` and `docs/frontend-testing.md`.
  They also apply when editing frontend infrastructure outside `src`.
- Every frontend behavior change must run tests for the changed file and its
  affected consumers. Every new application module must have its own colocated
  unit test. Do not finish a frontend change without reporting what was run.
- Backend changes must run the relevant pytest tests; before completing backend
  work, run the full suite with `python -m pytest` from the repository root.
  Use the same virtual environment for installation and execution.
- Preserve unrelated working-tree changes. Never commit environment files,
  `.claude/`, credentials, generated coverage, or dependency directories.
- Do not skip failing tests, use `--passWithNoTests` to mask missing coverage, or
  lower coverage requirements to get a change through. Report external blockers.
