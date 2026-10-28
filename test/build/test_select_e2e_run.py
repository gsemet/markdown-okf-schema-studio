"""Unit tests for the CI run selection of the Pages site build."""

from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("select_e2e_run", ROOT / "scripts/select_e2e_run.py")
assert spec and spec.loader
select = importlib.util.module_from_spec(spec)
spec.loader.exec_module(select)

SHA = "a" * 40
GOOD_JOBS = [{"name": "static", "conclusion": "success"}, {"name": "integration", "conclusion": "success"}]
ALL = [{"name": n} for n in select.REQUIRED_ARTIFACTS]


def run(rid: int, created: str, **over: object) -> dict:
    base = {"id": rid, "created_at": created, "head_sha": SHA, "event": "workflow_dispatch",
            "status": "completed", "conclusion": "success"}
    return {**base, **over}


def pick(runs: list[dict], jobs=GOOD_JOBS, artifacts=ALL) -> int | None:
    return select.select_run(runs, SHA, lambda _: jobs, lambda _: artifacts)


def test_newest_qualifying_run_wins() -> None:
    assert pick([run(1, "2026-10-01"), run(2, "2026-10-02")]) == 2


def test_no_run_means_fallback() -> None:
    assert pick([]) is None


def test_other_commit_event_or_failure_is_ignored() -> None:
    runs = [run(1, "1", head_sha="b" * 40), run(2, "2", event="push"), run(3, "3", conclusion="failure"),
            run(4, "4", status="in_progress")]
    assert pick(runs) is None


def test_a_run_without_a_successful_integration_job_is_ignored() -> None:
    skipped = [{"name": "integration", "conclusion": "skipped"}]
    assert pick([run(1, "1")], jobs=skipped) is None
    assert pick([run(1, "1")], jobs=[]) is None


def test_missing_or_expired_artifacts_are_ignored() -> None:
    assert pick([run(1, "1")], artifacts=ALL[:2]) is None
    expired = [{**a, "expired": True} for a in ALL]
    assert pick([run(1, "1")], artifacts=expired) is None


def test_older_complete_run_is_used_when_the_newest_lacks_artifacts() -> None:
    def artifacts(rid: int) -> list[dict]:
        return ALL if rid == 1 else []

    found = select.select_run([run(1, "1"), run(2, "2")], SHA, lambda _: GOOD_JOBS, artifacts)
    assert found == 1
