"""Unit tests for the CI run selection of the Pages site build."""

from __future__ import annotations

import importlib.util
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("select_e2e_run", ROOT / "scripts/select_e2e_run.py")
assert spec and spec.loader
select = importlib.util.module_from_spec(spec)
spec.loader.exec_module(select)

SHA = "a" * 40
GOOD_JOBS = [{"name": "static", "conclusion": "success"}, {"name": "integration", "conclusion": "success"}]
ALL = [{"name": n} for n in select.REQUIRED_ARTIFACTS]


def run(rid: int, created: str, **over: object) -> dict:
    base = {"path": ".github/workflows/ci.yml", "id": rid, "created_at": created, "head_sha": SHA, "event": "workflow_dispatch",
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


def check(r: dict, jobs=GOOD_JOBS, artifacts=ALL) -> str | None:
    return select.validate_run(r, SHA, lambda _: jobs, lambda _: artifacts)


def test_explicit_run_that_qualifies_is_accepted() -> None:
    assert check(run(7, "1")) is None


def test_explicit_run_is_rejected_for_each_mismatch() -> None:
    assert "ci.yml" in (check(run(1, "1", path=".github/workflows/other.yml")) or "")
    assert "commit" in (check(run(1, "1", head_sha="b" * 40)) or "")
    assert "event" in (check(run(1, "1", event="pull_request")) or "")
    assert check(run(1, "1", conclusion="failure"))
    assert check(run(1, "1", status="in_progress", conclusion=None))
    assert "integration" in (check(run(1, "1"), jobs=[{"name": "integration", "conclusion": "skipped"}]) or "")
    assert "integration" in (check(run(1, "1"), jobs=[]) or "")
    assert "artifacts" in (check(run(1, "1"), artifacts=ALL[:2]) or "")
    assert check(run(1, "1"), artifacts=[{**a, "expired": True} for a in ALL])


def _patch(monkeypatch, *, run_obj=None, fail=False) -> None:
    def boom(*_a, **_k):
        raise subprocess.CalledProcessError(1, "gh")

    monkeypatch.setattr(select, "gh_api", boom if fail else lambda path, key: GOOD_JOBS if key == "jobs" else ALL)
    monkeypatch.setattr(select, "gh_object", boom if fail else lambda path: run_obj)


def test_main_explicit_run_id_fails_closed(monkeypatch, capsys) -> None:
    argv = ["--repo", "o/r", "--sha", SHA, "--run-id", "9"]
    _patch(monkeypatch, run_obj=run(9, "1", head_sha="b" * 40))
    assert select.main(argv) == 1
    assert "not usable" in capsys.readouterr().err
    _patch(monkeypatch, fail=True)
    assert select.main(argv) == 1
    _patch(monkeypatch, run_obj=run(9, "1"))
    assert select.main(argv) == 0
    assert capsys.readouterr().out.strip() == "9"


def test_main_automatic_selection_falls_back_when_the_api_fails(monkeypatch, capsys) -> None:
    _patch(monkeypatch, fail=True)
    assert select.main(["--repo", "o/r", "--sha", SHA]) == 0
    captured = capsys.readouterr()
    assert captured.out == "" and "warning" in captured.err


def test_main_automatic_selection_falls_back_on_malformed_json(monkeypatch, capsys) -> None:
    def bad(*_a, **_k):
        raise ValueError("Expecting value: line 1 column 1 (char 0)")

    monkeypatch.setattr(select, "gh_api", bad)
    assert select.main(["--repo", "o/r", "--sha", SHA]) == 0
    captured = capsys.readouterr()
    assert captured.out == "" and "warning" in captured.err


# A push run of main is the release run of a version change: its heavy jobs ran in it.
HEAVY_JOBS = [*GOOD_JOBS, {"name": "stress", "conclusion": "success"}]


def push(rid: int, created: str, **over: object) -> dict:
    return run(rid, created, **{"event": "push", "head_branch": "main", **over})


# @tests_req SwRS-MDOKFSTUDIO-CORE-076
def test_release_push_run_with_green_heavy_jobs_is_used() -> None:
    assert pick([push(1, "1")], jobs=HEAVY_JOBS) == 1
    assert check(push(1, "1"), jobs=HEAVY_JOBS) is None
    # The newest of a manual heavy run and the release push wins.
    assert pick([run(1, "1"), push(2, "2")], jobs=HEAVY_JOBS) == 2


# @tests_req SwRS-MDOKFSTUDIO-CORE-076
@pytest.mark.parametrize(
    "jobs",
    [
        GOOD_JOBS,  # stress absent
        [*GOOD_JOBS, {"name": "stress", "conclusion": "skipped"}],
        [*GOOD_JOBS, {"name": "stress", "conclusion": "failure"}],
        [{"name": "integration", "conclusion": "skipped"}, {"name": "stress", "conclusion": "skipped"}],
        [{"name": "integration", "conclusion": "failure"}, {"name": "stress", "conclusion": "success"}],
    ],
)
def test_push_run_without_both_green_heavy_jobs_is_rejected(jobs: list[dict]) -> None:
    assert pick([push(1, "1")], jobs=jobs) is None
    problem = check(push(1, "1"), jobs=jobs) or ""
    assert "integration" in problem and "stress" in problem


# @tests_req SwRS-MDOKFSTUDIO-CORE-076
def test_push_run_of_another_commit_branch_or_state_is_rejected() -> None:
    for bad in (push(1, "1", head_sha="b" * 40), push(1, "1", head_branch="feature"),
                push(1, "1", head_branch=None), push(1, "1", conclusion="failure"),
                push(1, "1", status="in_progress", conclusion=None)):
        assert pick([bad], jobs=HEAVY_JOBS) is None
        assert check(bad, jobs=HEAVY_JOBS)
    assert "branch" in (check(push(1, "1", head_branch="feature"), jobs=HEAVY_JOBS) or "")
    assert "artifacts" in (check(push(1, "1"), jobs=HEAVY_JOBS, artifacts=ALL[:2]) or "")


# @tests_req SwRS-MDOKFSTUDIO-CORE-076
def test_main_automatic_selection_queries_dispatch_and_push_runs(monkeypatch, capsys) -> None:
    queried: list[str] = []

    def api(path: str, key: str) -> list[dict]:
        if key == "workflow_runs":
            queried.append(path)
            return [push(5, "5")] if "event=push" in path else []
        return HEAVY_JOBS if key == "jobs" else ALL

    monkeypatch.setattr(select, "gh_api", api)
    assert select.main(["--repo", "o/r", "--sha", SHA]) == 0
    assert capsys.readouterr().out.strip() == "5"
    assert any("event=workflow_dispatch" in q for q in queried) and any("event=push" in q for q in queried)
