"""Keep manual diagnostics out of pytest, including `pytest backend` runs."""
from tempfile import TemporaryDirectory


def pytest_configure(config):
    """Avoid shared OS temp folders that can belong to another Windows account."""
    if config.option.basetemp is not None:
        return

    # Create directly in this process's writable temp location. Never reuse
    # pytest-of-<user> or a checkout cache created by another security context.
    run_directory = TemporaryDirectory(prefix="saturday-smashers-pytest-")
    config.option.basetemp = run_directory.name
    config.add_cleanup(run_directory.cleanup)

# These standalone scripts can contact live services at import time. Automated
# tests belong in backend/tests; this applies only to files beside this conftest.
collect_ignore_glob = ["test_*.py", "scratch_test.py"]
