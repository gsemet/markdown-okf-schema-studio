"""Run scripts/changelog_refs.py in temporary Git repositories."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts/changelog_refs.py"
OLD = "## 1.0.0 - 2026-01-01\n\n- An old line without any reference.\n"


def git(repo: Path, *arguments: str) -> str:
    return subprocess.check_output(
        [
            "git",
            "-c",
            "user.name=Test",
            "-c",
            "user.email=test@example.com",
            "-c",
            "commit.gpgsign=false",
            *arguments,
        ],
        cwd=repo,
        text=True,
    ).strip()


def changelog(repo: Path) -> Path:
    return repo / "CHANGELOG.md"


def commit_text(repo: Path, text: str) -> str:
    """Write the changelog, commit it, and return the short SHA-1 of the commit."""
    changelog(repo).write_bytes(text.encode("utf-8"))
    git(repo, "add", "CHANGELOG.md")
    git(repo, "commit", "-q", "-m", "change")
    return git(repo, "rev-parse", "--short", "HEAD")


def make_repo(tmp_path: Path) -> Path:
    git(tmp_path, "init", "-q", "-b", "main")
    commit_text(tmp_path, f"# Changelog\n\n## Unreleased\n\n{OLD}")
    return tmp_path


def changelog_with(unreleased: str) -> str:
    return f"# Changelog\n\n## Unreleased\n\n{unreleased}\n{OLD}"


def run(repo: Path, *arguments: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(SCRIPT), "--base", "main", *arguments],
        cwd=repo,
        text=True,
        capture_output=True,
    )


# @tests_req SwRS-MDOKFSTUDIO-CORE-094
def test_a_group_gets_the_commit_first(tmp_path: Path) -> None:
    repo = make_repo(tmp_path)
    sha = commit_text(repo, changelog_with("- A tooltip. (CR-463 change-bar-tooltip, PR #476, issue #413)\n"))
    result = run(repo)
    assert result.returncode == 0, result.stderr
    text = changelog(repo).read_text(encoding="utf-8")
    assert f"- A tooltip. (commit {sha}, CR-463 change-bar-tooltip, PR #476, issue #413)\n" in text
    assert text.endswith(OLD)


# @tests_req SwRS-MDOKFSTUDIO-CORE-094
def test_gitlab_and_jira_groups_are_recognised(tmp_path: Path) -> None:
    repo = make_repo(tmp_path)
    sha = commit_text(repo, changelog_with("- A fix. (MR !476, issue PROJ-12)\n"))
    assert run(repo).returncode == 0
    assert f"- A fix. (commit {sha}, MR !476, issue PROJ-12)\n" in changelog(repo).read_text(encoding="utf-8")


# @tests_req SwRS-MDOKFSTUDIO-CORE-094
def test_a_line_without_group_gets_one(tmp_path: Path) -> None:
    repo = make_repo(tmp_path)
    sha = commit_text(repo, changelog_with("- A plain line (see the guide).\n"))
    assert run(repo).returncode == 0
    assert f"- A plain line (see the guide). (commit {sha})\n" in changelog(repo).read_text(encoding="utf-8")


# @tests_req SwRS-MDOKFSTUDIO-CORE-094
def test_a_multi_line_bullet_takes_the_commit_of_its_first_line(tmp_path: Path) -> None:
    repo = make_repo(tmp_path)
    first = commit_text(repo, changelog_with("- A long line\n  on three\n  physical lines.\n"))
    commit_text(repo, changelog_with("- A long line\n  on three\n  physical lines. (PR #9)\n"))
    assert run(repo).returncode == 0
    text = changelog(repo).read_text(encoding="utf-8")
    assert f"- A long line\n  on three\n  physical lines. (commit {first}, PR #9)\n" in text


# @tests_req SwRS-MDOKFSTUDIO-CORE-094
def test_two_bullets_get_their_own_commit(tmp_path: Path) -> None:
    repo = make_repo(tmp_path)
    one = commit_text(repo, changelog_with("- First. (PR #1)\n"))
    two = commit_text(repo, changelog_with("- First. (PR #1)\n- Second. (PR #2)\n"))
    assert one != two
    assert run(repo).returncode == 0
    text = changelog(repo).read_text(encoding="utf-8")
    assert f"- First. (commit {one}, PR #1)\n" in text
    assert f"- Second. (commit {two}, PR #2)\n" in text


# @tests_req SwRS-MDOKFSTUDIO-CORE-094
def test_a_second_run_changes_nothing(tmp_path: Path) -> None:
    repo = make_repo(tmp_path)
    commit_text(repo, changelog_with("- First. (PR #1)\n- Second.\n"))
    assert run(repo).returncode == 0
    git(repo, "commit", "-q", "-am", "refs")
    before = changelog(repo).read_bytes()
    assert run(repo).returncode == 0
    assert changelog(repo).read_bytes() == before


# @tests_req SwRS-MDOKFSTUDIO-CORE-094
def test_an_uncommitted_changelog_is_refused(tmp_path: Path) -> None:
    repo = make_repo(tmp_path)
    commit_text(repo, changelog_with("- First. (PR #1)\n"))
    changelog(repo).write_bytes(changelog(repo).read_bytes() + b"\n- Draft.\n")
    before = changelog(repo).read_bytes()
    result = run(repo)
    assert result.returncode == 1
    assert "uncommitted" in result.stderr
    assert changelog(repo).read_bytes() == before


def side_branch_line(repo: Path, unreleased: str) -> str:
    """Commit a line on a branch that is not the base, and come back to main."""
    git(repo, "switch", "-q", "-c", "side")
    sha = commit_text(repo, changelog_with(unreleased))
    return sha


# @tests_req SwRS-MDOKFSTUDIO-CORE-094
def test_a_commit_not_on_the_base_is_refused(tmp_path: Path) -> None:
    repo = make_repo(tmp_path)
    side_branch_line(repo, "- Foreign line here. (PR #3)\n")
    before = changelog(repo).read_bytes()
    result = run(repo)
    assert result.returncode == 1
    assert "Foreign line here" in result.stderr
    assert changelog(repo).read_bytes() == before


# @tests_req SwRS-MDOKFSTUDIO-CORE-094
def test_an_empty_section_changes_nothing(tmp_path: Path) -> None:
    repo = make_repo(tmp_path)
    before = changelog(repo).read_bytes()
    result = run(repo)
    assert result.returncode == 0
    assert "No line to update" in result.stdout
    assert changelog(repo).read_bytes() == before


# @tests_req SwRS-MDOKFSTUDIO-CORE-094
def test_the_written_file_has_lf_line_endings(tmp_path: Path) -> None:
    repo = make_repo(tmp_path)
    commit_text(repo, changelog_with("- First. (PR #1)\n- Second.\n"))
    assert run(repo).returncode == 0
    assert b"\r" not in changelog(repo).read_bytes()


# @tests_req SwRS-MDOKFSTUDIO-CORE-094
def test_skip_missing_leaves_a_foreign_line_and_updates_the_others(tmp_path: Path) -> None:
    repo = make_repo(tmp_path)
    one = commit_text(repo, changelog_with("- Own line. (PR #1)\n"))
    git(repo, "switch", "-q", "-c", "side")
    commit_text(repo, changelog_with("- Own line. (PR #1)\n- Foreign line here. (PR #3)\n"))
    result = run(repo, "--skip-missing")
    assert result.returncode == 0, result.stderr
    assert "skipped: Foreign line here. (PR #3)" in result.stdout
    text = changelog(repo).read_text(encoding="utf-8")
    assert f"- Own line. (commit {one}, PR #1)\n" in text
    assert "- Foreign line here. (PR #3)\n" in text
