"""Check the supply-chain rules of the CI workflows and of the justfile."""

from __future__ import annotations

import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
WORKFLOWS = sorted((ROOT / ".github/workflows").glob("*.yml"))
USES = re.compile(r"^\s*(?:-\s+)?uses:\s*(\S+)(.*)$")
PINNED = re.compile(r"^[\w.-]+/[\w./-]+@[0-9a-f]{40}$")


def _jobs(text: str) -> dict[str, str]:
    """Split a workflow into its job blocks (two-space indented keys under ``jobs:``)."""
    body = text.split("\njobs:\n", 1)[1]
    parts = re.split(r"(?m)^  ([\w-]+):\n", body)
    return dict(zip(parts[1::2], parts[2::2]))


@pytest.mark.parametrize("path", WORKFLOWS, ids=lambda p: p.name)
def test_actions_are_pinned_to_a_commit_sha_with_the_tag_in_a_comment(path: Path) -> None:
    for line in path.read_text().splitlines():
        match = USES.match(line)
        if not match or match.group(1).startswith("./"):
            continue
        assert PINNED.match(match.group(1)), f"{path.name}: not SHA-pinned: {line.strip()}"
        assert re.match(r"\s*#\s*v\d", match.group(2)), f"{path.name}: tag comment missing: {line.strip()}"


@pytest.mark.parametrize("path", WORKFLOWS, ids=lambda p: p.name)
def test_every_job_declares_its_own_permissions(path: Path) -> None:
    for name, block in _jobs(path.read_text()).items():
        assert re.search(r"(?m)^    permissions:", block), f"{path.name}: job {name} has no permissions"


@pytest.mark.parametrize("path", WORKFLOWS, ids=lambda p: p.name)
def test_workflow_default_permissions_are_read_only(path: Path) -> None:
    top = re.search(r"(?m)^permissions:\n((?:  .*\n)+)", path.read_text())
    assert top, f"{path.name}: no workflow-level permissions"
    assert "write" not in top.group(1), f"{path.name}: workflow-level write permission"


def test_release_job_keeps_dependency_install_scripts_off() -> None:
    text = (ROOT / ".github/workflows/release.yml").read_text()
    assert "npm ci --ignore-scripts" in text
    assert "patch-myst-imports" not in text


def test_static_ci_target_runs_an_online_audit_of_production_dependencies() -> None:
    justfile = (ROOT / "justfile").read_text()
    audit = re.search(r"(?m)^audit:\n((?:    .*\n)+)", justfile)
    assert audit, "no audit target"
    assert "audit --omit=dev --audit-level=high" in audit.group(1)
    assert "--offline" not in audit.group(1)
    static = re.search(r"(?m)^ci-static:\n((?:    .*\n)+)", justfile)
    assert static and "just audit" in static.group(1)


# A job downstream of a skipped job carries an implicit success() that is false, so it is skipped
# too. The heavy jobs are skipped on push; every job below them must opt out of that default.
CI = ROOT / ".github/workflows/ci.yml"


# `report` merges whatever artifacts exist, including after a failed or skipped job.
REPORTS_WHATEVER_HAPPENED = {"report"}


def _ci_jobs() -> dict[str, dict]:
    import yaml

    return yaml.safe_load(CI.read_text())["jobs"]


def _needs(job: dict) -> list[str]:
    needs = job.get("needs", [])
    return [needs] if isinstance(needs, str) else list(needs)


def _opts_out_of_skip(condition: str) -> bool:
    return "!cancelled()" in condition or "always()" in condition


def _after_a_skippable_job(jobs: dict[str, dict]) -> set[str]:
    """Jobs with a possibly skipped ancestor: skippable jobs propagate through ``needs``."""
    # A job is skippable on its own when it has an ``if`` that does not opt out of the skip.
    skippable = {n for n, j in jobs.items() if "if" in j and not _opts_out_of_skip(str(j["if"]))}
    downstream: set[str] = set()
    changed = True
    while changed:
        changed = False
        for name, job in jobs.items():
            if name not in downstream and any(
                need in skippable or need in downstream for need in _needs(job)
            ):
                downstream.add(name)
                changed = True
    return downstream


# @tests_req SwRS-MDOKFSTUDIO-CORE-076
def test_every_job_after_a_skippable_job_opts_out_of_the_implicit_success() -> None:
    jobs = _ci_jobs()
    for name in sorted(_after_a_skippable_job(jobs)):
        condition = str(jobs[name].get("if", ""))
        if "inputs.heavy" in condition:
            continue  # runs only when the heavy ancestors ran, so nothing above it is skipped
        assert _opts_out_of_skip(condition), f"{name}: needs a skippable job but has no !cancelled()"
        if name in REPORTS_WHATEVER_HAPPENED:
            continue
        # The aggregate job checks every result itself in its script (join(needs.*.result)).
        checked = re.search(r"needs\.[\w-]+\.result", condition) or "join(needs.*.result" in str(jobs[name])
        assert checked, f"{name}: no explicit needs.<job>.result check in: {condition}"


# @tests_req SwRS-MDOKFSTUDIO-CORE-076
def test_tag_release_runs_on_a_push_to_main_when_the_checks_passed() -> None:
    condition = str(_ci_jobs()["tag-release"]["if"])
    for part in ("!cancelled()", "needs.checks.result == 'success'", "github.event_name == 'push'",
                 "github.ref == 'refs/heads/main'"):
        assert part in condition, f"tag-release: {part} missing from: {condition}"


# @tests_req SwRS-MDOKFSTUDIO-CORE-076
@pytest.mark.parametrize("name", ["release", "pages"])
def test_release_and_pages_run_when_a_tag_was_created(name: str) -> None:
    condition = str(_ci_jobs()[name]["if"])
    for part in ("!cancelled()", "needs.tag-release.result == 'success'",
                 "needs.tag-release.outputs.tag != ''"):
        assert part in condition, f"{name}: {part} missing from: {condition}"
