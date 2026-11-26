"""The merge-commit check of ``ci-static``: ``just check-no-merge-commits`` on throwaway git repositories."""

from __future__ import annotations

import os
import re
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
IDENTITY = ["-c", "user.name=Test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false"]


def _git(repository: Path, *arguments: str) -> str:
    result = subprocess.run(
        ["git", *IDENTITY, "-C", str(repository), *arguments], capture_output=True, text=True
    )
    assert result.returncode == 0, result.stderr
    return result.stdout.strip()


def _commit(repository: Path, subject: str) -> None:
    _git(repository, "commit", "--allow-empty", "-m", subject)


def _push_main(clone: Path, subject: str) -> None:
    _git(clone, "checkout", "--quiet", "main")
    _commit(clone, subject)
    _git(clone, "push", "--quiet", "origin", "main")


@pytest.fixture
def clone(tmp_path: Path) -> Path:
    """A clone of a bare origin whose ``main`` has one commit."""
    origin = tmp_path / "origin.git"
    subprocess.run(["git", "init", "--quiet", "--bare", "--initial-branch=main", str(origin)], check=True)
    work = tmp_path / "work"
    subprocess.run(["git", "clone", "--quiet", str(origin), str(work)], check=True, capture_output=True)
    _git(work, "checkout", "--quiet", "-B", "main")
    _commit(work, "base")
    _git(work, "push", "--quiet", "origin", "main")
    return work


def _check(clone: Path, *base: str) -> "subprocess.CompletedProcess[str]":
    return subprocess.run(
        [
            "just",
            "--justfile",
            str(ROOT / "justfile"),
            "--working-directory",
            str(clone),
            "check-no-merge-commits",
            *base,
        ],
        capture_output=True,
        text=True,
    )


def _script_stderr(result: "subprocess.CompletedProcess[str]") -> str:
    """The script's own stderr: without the echoed command and the `error:` line that just adds."""
    lines = [line for line in result.stderr.splitlines() if not line.startswith(("error:", "bash "))]
    return "\n".join(lines).strip()


def _branch_with_merge(clone: Path) -> str:
    """A feature branch updated by merge, as GitHub's "Update branch" does; returns the merge subject."""
    _git(clone, "checkout", "--quiet", "-b", "feature")
    _commit(clone, "feature work")
    _push_main(clone, "main moved")
    _git(clone, "checkout", "--quiet", "feature")
    _git(clone, "merge", "--no-ff", "-m", "Merge branch main into feature", "origin/main")
    return "Merge branch main into feature"


def _test_merge(clone: Path, branch: str) -> None:
    """Detach HEAD on a synthetic merge of ``branch`` into the tip of origin/main, like a forge's test merge."""
    _git(clone, "checkout", "--quiet", "--detach", "origin/main")
    _git(clone, "merge", "--no-ff", "-m", "test merge", branch)


def test_linear_branch_passes(clone: Path) -> None:
    _git(clone, "checkout", "--quiet", "-b", "feature")
    _commit(clone, "one")
    _commit(clone, "two")
    result = _check(clone, "origin/main")
    assert result.returncode == 0, result.stderr
    assert "passed (2 commits since origin/main" in result.stdout


def test_branch_updated_by_merge_fails_with_the_rebase_command(clone: Path) -> None:
    subject = _branch_with_merge(clone)
    short = _git(clone, "rev-parse", "--short", "HEAD")
    result = _check(clone, "origin/main")
    assert result.returncode == 1
    assert f"{short} {subject}" in result.stderr
    assert "git rebase origin/main" in result.stderr
    assert "--force-with-lease" in result.stderr
    assert _script_stderr(result).endswith("FAILED")


def test_default_base_is_origin_main(clone: Path) -> None:
    _branch_with_merge(clone)
    result = _check(clone)
    assert result.returncode == 1
    assert "git rebase origin/main" in result.stderr


def test_test_merge_of_a_linear_branch_passes(clone: Path) -> None:
    _git(clone, "checkout", "--quiet", "-b", "feature")
    _commit(clone, "one")
    _test_merge(clone, "feature")
    result = _check(clone, "origin/main")
    assert result.returncode == 0, result.stderr
    assert "passed (1 commits since origin/main" in result.stdout


def test_test_merge_passes_when_main_moved_after_it(clone: Path) -> None:
    _git(clone, "checkout", "--quiet", "-b", "feature")
    _commit(clone, "one")
    _test_merge(clone, "feature")
    _push_main(clone, "main moved")
    _git(clone, "checkout", "--quiet", "--detach", "feature")
    _git(clone, "checkout", "--quiet", "--detach", "origin/main~1")
    _git(clone, "merge", "--no-ff", "-m", "test merge", "feature")
    result = _check(clone, "origin/main")
    assert result.returncode == 0, result.stderr


def test_test_merge_of_a_branch_that_carries_a_merge_fails(clone: Path) -> None:
    subject = _branch_with_merge(clone)
    inner = _git(clone, "rev-parse", "--short", "HEAD")
    _push_main(clone, "main moved again")
    _test_merge(clone, "feature")
    result = _check(clone, "origin/main")
    assert result.returncode == 1
    assert f"{inner} {subject}" in result.stderr
    assert "test merge" not in result.stderr


def _stack(clone: Path, merged: "str | None" = None) -> None:
    """Nested stack branches ``s1``..``s3``, each from the one below, ``s1`` from origin/main.

    The branch named ``merged`` also merges a moved origin/main into itself, before the branch above forks.
    """
    below = "origin/main"
    for branch in ("s1", "s2", "s3"):
        _git(clone, "checkout", "--quiet", "-b", branch, below)
        _commit(clone, f"{branch} work")
        if branch == merged:
            _push_main(clone, "main moved")
            _git(clone, "checkout", "--quiet", branch)
            _git(clone, "merge", "--no-ff", "-m", f"Merge branch main into {branch}", "origin/main")
        below = branch


def _forge_merge(clone: Path, branch: str, subject: "str | None" = None) -> str:
    """Merge ``branch`` into HEAD, by default with the forge's subject; returns the short id of the merge."""
    first = _git(clone, "rev-parse", "HEAD")
    second = _git(clone, "rev-parse", branch)
    _git(clone, "merge", "--no-ff", "-m", subject or f"Merge {second} into {first}", second)
    return _git(clone, "rev-parse", "--short", "HEAD")


def _chained_test_merge(clone: Path, *branches: str) -> "list[str]":
    """Detach HEAD on origin/main and merge each branch on the merge before it, like a native stack's test merge."""
    _git(clone, "checkout", "--quiet", "--detach", "origin/main")
    return [_forge_merge(clone, branch) for branch in branches]


def test_chained_test_merge_of_a_linear_stack_passes(clone: Path) -> None:
    _stack(clone)
    _chained_test_merge(clone, "s1", "s2", "s3")
    result = _check(clone, "origin/main")
    assert result.returncode == 0, result.stderr
    assert "passed (3 commits since origin/main" in result.stdout


def test_chained_test_merge_passes_against_the_lower_branch_base(clone: Path) -> None:
    _stack(clone)
    _git(clone, "push", "--quiet", "origin", "s2")
    _chained_test_merge(clone, "s1", "s2", "s3")
    result = _check(clone, "origin/s2")
    assert result.returncode == 0, result.stderr
    assert "passed (1 commits since origin/s2" in result.stdout


def test_chained_test_merge_fails_when_the_top_branch_carries_a_merge(clone: Path) -> None:
    _stack(clone, merged="s3")
    inner = _git(clone, "rev-parse", "--short", "s3")
    chain = _chained_test_merge(clone, "s1", "s2", "s3")
    result = _check(clone, "origin/main")
    assert result.returncode == 1
    assert f"{inner} Merge branch main into s3" in result.stderr
    assert not [merge for merge in chain if merge in result.stderr]


def test_chained_test_merge_fails_when_a_lower_branch_carries_a_merge(clone: Path) -> None:
    _stack(clone, merged="s1")
    inner = _git(clone, "rev-parse", "--short", "s1")
    chain = _chained_test_merge(clone, "s1", "s2", "s3")
    result = _check(clone, "origin/main")
    assert result.returncode == 1
    assert f"{inner} Merge branch main into s1" in result.stderr
    assert not [merge for merge in chain if merge in result.stderr]


def test_chain_with_non_nested_heads_reports_every_merge(clone: Path) -> None:
    for branch in ("a", "b", "c"):
        _git(clone, "checkout", "--quiet", "-b", branch, "origin/main")
        _commit(clone, f"{branch} work")
    chain = _chained_test_merge(clone, "a", "b", "c")
    result = _check(clone, "origin/main")
    assert result.returncode == 1
    assert [merge for merge in chain if merge in result.stderr] == chain


def test_nested_chain_with_another_subject_reports_every_merge(clone: Path) -> None:
    _stack(clone)
    _git(clone, "checkout", "--quiet", "--detach", "origin/main")
    chain = [
        _forge_merge(clone, "s1", "Merge branch s1"),
        _forge_merge(clone, "s2"),
        _forge_merge(clone, "s3"),
    ]
    result = _check(clone, "origin/main")
    assert result.returncode == 1
    assert [merge for merge in chain if merge in result.stderr] == chain


def test_chain_not_rooted_on_the_base_reports_every_merge(clone: Path) -> None:
    _stack(clone)
    _git(clone, "checkout", "--quiet", "-b", "feature", "origin/main")
    _commit(clone, "feature work")
    chain = [_forge_merge(clone, "s1"), _forge_merge(clone, "s2")]
    result = _check(clone, "origin/main")
    assert result.returncode == 1
    assert [merge for merge in chain if merge in result.stderr] == chain


def test_stacked_base_counts_only_the_branch_commits(clone: Path) -> None:
    _git(clone, "checkout", "--quiet", "-b", "lower")
    _commit(clone, "lower one")
    _commit(clone, "lower two")
    _git(clone, "push", "--quiet", "origin", "lower")
    _git(clone, "checkout", "--quiet", "-b", "upper")
    _commit(clone, "upper one")
    result = _check(clone, "origin/lower")
    assert result.returncode == 0, result.stderr
    assert "passed (1 commits since origin/lower" in result.stdout


def test_unresolved_base_fails_naming_the_base_and_the_fetch(clone: Path) -> None:
    result = _check(clone, "origin/nope")
    assert result.returncode == 1
    assert "origin/nope" in result.stderr
    assert "git fetch origin" in result.stderr
    assert _script_stderr(result).endswith("FAILED")


def _base_for(tmp_path: Path, **variables: str) -> str:
    dropped = ("GITHUB_BASE_REF", "CI_MERGE_REQUEST_TARGET_BRANCH_NAME")
    environment = {k: v for k, v in os.environ.items() if k not in dropped}
    environment.update(variables)
    result = subprocess.run(
        ["just", "--justfile", str(ROOT / "justfile"), "--working-directory", str(tmp_path), "_merge-check-base"],
        capture_output=True,
        text=True,
        env=environment,
    )
    assert result.returncode == 0, result.stderr
    return result.stdout.strip()


def test_ci_static_runs_the_check_first_with_the_base_of_the_ci(tmp_path: Path) -> None:
    justfile = (ROOT / "justfile").read_text()
    recipe = justfile.split("\nci-static:\n")[1].split("\n\n")[0]
    assert recipe.index("just _merge-check-base") < recipe.index("just check-no-merge-commits")
    assert recipe.index("just check-no-merge-commits") < recipe.index("just check &&")
    assert _base_for(tmp_path, GITHUB_BASE_REF="lower") == "origin/lower"
    assert _base_for(tmp_path, GITHUB_BASE_REF="") == "origin/main"
    assert _base_for(tmp_path, CI_MERGE_REQUEST_TARGET_BRANCH_NAME="lower") == "origin/lower"
    assert _base_for(tmp_path, GITHUB_BASE_REF="a", CI_MERGE_REQUEST_TARGET_BRANCH_NAME="b") == "origin/a"
    assert _base_for(tmp_path) == "origin/main"


def _jobs(text: str) -> dict[str, str]:
    body = text.split("\njobs:\n", 1)[1]
    parts = re.split(r"(?m)^  ([\w-]+):\n", body)
    return dict(zip(parts[1::2], parts[2::2]))


@pytest.mark.parametrize("job", ["static", "static-windows"])
def test_static_jobs_check_out_the_full_history(job: str) -> None:
    block = _jobs((ROOT / ".github/workflows/ci.yml").read_text())[job]
    checkout = block.split("actions/checkout@", 1)[1].split("      - name:", 1)[0]
    assert re.search(r"(?m)^\s+fetch-depth: 0$", checkout)
    assert "lfs: true" in checkout


def test_guideline_has_the_updating_a_branch_section_without_a_process_role() -> None:
    text = (ROOT / ".agents/guidelines/pull-request.guidelines.md").read_text()
    assert "\n## Updating a branch\n" in text
    section = text.split("\n## Updating a branch\n")[1].split("\n## ")[0]
    assert "--force-with-lease" in section
    assert "check-no-merge-commits" in section
    assert "Driver" not in text
