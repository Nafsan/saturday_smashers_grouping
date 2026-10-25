"""Regression checks for independent, per-run pytest temporary directories."""
import importlib.util
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

pytestmark = pytest.mark.unit


@pytest.fixture
def infrastructure():
    spec = importlib.util.spec_from_file_location(
        "backend_test_configuration", Path(__file__).parents[1] / "conftest.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_default_temp_directories_are_unique_and_cleaned(infrastructure, tmp_path):
    configs = [SimpleNamespace(rootpath=tmp_path, option=SimpleNamespace(basetemp=None),
                               add_cleanup=MagicMock()) for _ in range(2)]
    try:
        for config in configs:
            infrastructure.pytest_configure(config)
        paths = [Path(config.option.basetemp) for config in configs]
        assert paths[0] != paths[1]
        for path in paths:
            assert path.name.startswith("saturday-smashers-pytest-")
            assert tmp_path not in path.parents
            assert path.is_dir()
            (path / "cache.json").write_text("{}", encoding="utf-8")
    finally:
        for config in configs:
            config.add_cleanup.call_args.args[0]()
    assert all(not path.exists() for path in paths)


def test_unusable_checkout_cache_does_not_block_tests(infrastructure, tmp_path):
    # A file where a cache directory would be makes mkdir/stat unusable, without
    # changing Windows ACLs or requiring an elevated test process.
    (tmp_path / ".pytest_cache").write_text("unusable cache", encoding="utf-8")
    config = SimpleNamespace(rootpath=tmp_path, option=SimpleNamespace(basetemp=None),
                             add_cleanup=MagicMock())
    infrastructure.pytest_configure(config)
    try:
        assert Path(config.option.basetemp).is_dir()
        assert (tmp_path / ".pytest_cache").is_file()
    finally:
        config.add_cleanup.call_args.args[0]()


def test_explicit_basetemp_is_preserved(infrastructure, tmp_path):
    custom = str(tmp_path / "custom")
    config = SimpleNamespace(rootpath=tmp_path, option=SimpleNamespace(basetemp=custom),
                             add_cleanup=MagicMock())
    infrastructure.pytest_configure(config)
    assert config.option.basetemp == custom
    config.add_cleanup.assert_not_called()
    assert not (tmp_path / ".pytest_cache").exists()
