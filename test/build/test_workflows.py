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
