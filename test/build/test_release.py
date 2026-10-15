"""Exercise release versioning in isolated Git repositories."""

from __future__ import annotations

import json
import importlib.util
import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]

spec = importlib.util.spec_from_file_location(
    "release_notes", ROOT / "scripts/release_notes.py"
)
assert spec and spec.loader
notes = importlib.util.module_from_spec(spec)
spec.loader.exec_module(notes)


def test_copilot_final_answer() -> None:
    """Persist only a final answer with a successful result event."""
    markdown = "## Bug Fixes\n\n- Preserve table edits."
    events = [
        {
            "type": "assistant.message",
            "data": {"phase": "commentary", "content": "Working"},
        },
        {
            "type": "assistant.message",
            "data": {"phase": "final_answer", "content": markdown},
        },
        {"type": "result", "exitCode": 0},
    ]
    assert notes.final_answer("\n".join(map(json.dumps, events))) == markdown + "\n"
    with pytest.raises(ValueError):
        notes.final_answer("\n".join(map(json.dumps, events[:-1])))
    events[-1]["exitCode"] = 1
    with pytest.raises(ValueError):
        notes.final_answer("\n".join(map(json.dumps, events)))


@pytest.mark.parametrize(
    "markdown",
    [
        "# v1.0.0\n\n- Something",
        "## Bug Fixes",
        "## Bug Fixes\n\n- Fixed\n- Fixed",
        "## Maintenance\n\n- Internal\n\n## Bug Fixes\n\n- Fixed",
        "## Documentation\n\n- See https://example.com/docs",
        "## Bug Fixes\n\n- <thinking>hidden",
        "## Bug Fixes\n\n- ```code```",
    ],
)
def test_reject_invalid_notes(markdown: str) -> None:
    """Fail closed instead of publishing malformed notes."""
    with pytest.raises(ValueError):
        notes.validate_notes(markdown)


@pytest.fixture
def repository(tmp_path: Path) -> Path:
    """Create a tagged npm project with Studio's Commitizen configuration."""
    shutil.copy(ROOT / "pyproject.toml", tmp_path / "pyproject.toml")
    (tmp_path / "package.json").write_text(json.dumps({"version": "0.2.0"}))
    (tmp_path / "package-lock.json").write_text(
        json.dumps(
            {
                "version": "0.2.0",
                "packages": {"": {"version": "0.2.0"}},
            }
        )
    )
    for arguments in (
        ["init", "--quiet"],
        ["config", "user.email", "test@example.com"],
        ["config", "user.name", "Release Test"],
        ["add", "."],
        ["commit", "--quiet", "-m", "chore: initial"],
        ["tag", "v0.2.0"],
    ):
        subprocess.run(["git", *arguments], cwd=tmp_path, check=True)
    return tmp_path


@pytest.mark.parametrize(
    ("message", "expected"),
    [
        ("feat: add a command", "0.3.0"),
        ("feat(editor)!: remove a command", "1.0.0"),
        ("fix: change command\n\nBREAKING CHANGE: old command removed", "1.0.0"),
        ("docs: clarify setup", "0.2.1"),
        ("Unconventional maintenance message", "0.2.1"),
        (None, "0.2.1"),
    ],
)
def test_automatic_version(
    repository: Path, message: str | None, expected: str
) -> None:
    """Classify commits without creating a commit or tag."""
    if message:
        subprocess.run(
            ["git", "commit", "--allow-empty", "--quiet", "-m", message],
            cwd=repository,
            check=True,
        )
    assert_version(repository, [], expected)


def assert_version(repository: Path, arguments: list[str], expected: str) -> None:
    """Check synchronized versions and unchanged Git history."""
    before = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repository)
    result = subprocess.run(
        [sys.executable, str(ROOT / "scripts/version.py"), *arguments],
        cwd=repository,
        text=True,
        capture_output=True,
    )
    assert result.returncode == 0, result.stderr
    assert json.loads((repository / "package.json").read_text())["version"] == expected
    lock = json.loads((repository / "package-lock.json").read_text())
    assert lock["version"] == lock["packages"][""]["version"] == expected
    assert (
        subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repository) == before
    )
    assert subprocess.check_output(["git", "tag"], cwd=repository).strip() == b"v0.2.0"


def test_explicit_version(repository: Path) -> None:
    """Allow maintainers to choose an increasing stable version."""
    assert_version(repository, ["2.3.4"], "2.3.4")


def test_stale_manifest(repository: Path) -> None:
    """Use the latest reachable release when the manifest is behind."""
    (repository / "package.json").write_text(json.dumps({"version": "0.1.1"}))
    assert_version(repository, [], "0.2.1")


@pytest.mark.parametrize("version", ["0.2.0", "0.1.9", "v1.0.0", "1.0", "01.0.0"])
def test_invalid_version_is_non_mutating(repository: Path, version: str) -> None:
    """Reject invalid versions before changing either manifest."""
    before = [
        (repository / name).read_bytes()
        for name in ("package.json", "package-lock.json")
    ]
    result = subprocess.run(
        [sys.executable, str(ROOT / "scripts/version.py"), version],
        cwd=repository,
        capture_output=True,
    )
    assert result.returncode != 0
    assert [
        (repository / name).read_bytes()
        for name in ("package.json", "package-lock.json")
    ] == before


def test_tag_bump_and_rerun(repository: Path, tmp_path: Path) -> None:
    """Tag only an increased version, and never move an existing remote tag."""
    remote = tmp_path / "remote.git"
    subprocess.run(["git", "init", "--bare", "--quiet", str(remote)], check=True)
    subprocess.run(
        ["git", "remote", "add", "origin", str(remote)], cwd=repository, check=True
    )
    before = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=repository, text=True
    ).strip()
    output = tmp_path / "outputs"
    environment = {**os.environ, "GITHUB_OUTPUT": str(output)}
    command = [sys.executable, str(ROOT / "scripts/version.py"), "--tag-before", before]
    unchanged = subprocess.run(
        command, cwd=repository, env=environment, capture_output=True
    )
    assert unchanged.returncode == 0
    assert not output.exists()
    assert_version(repository, ["0.3.0"], "0.3.0")
    subprocess.run(
        ["git", "add", "package.json", "package-lock.json"], cwd=repository, check=True
    )
    subprocess.run(
        ["git", "commit", "--quiet", "-m", "chore: release 0.3.0"],
        cwd=repository,
        check=True,
    )
    released = subprocess.run(
        command, cwd=repository, env=environment, text=True, capture_output=True
    )
    assert released.returncode == 0, released.stderr
    assert output.read_text() == "tag=v0.3.0\n"
    head = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=repository, text=True
    ).strip()
    assert (
        subprocess.check_output(
            ["git", "ls-remote", "origin", "refs/tags/v0.3.0"],
            cwd=repository,
            text=True,
        ).split()[0]
        == head
    )
    output.unlink()
    rerun = subprocess.run(
        command, cwd=repository, env=environment, capture_output=True
    )
    assert rerun.returncode == 0
    assert not output.exists()


def test_tag_rejects_inconsistent_versions(repository: Path) -> None:
    """Never tag a manifest-only bump with an outdated lockfile."""
    before = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=repository, text=True
    ).strip()
    (repository / "package.json").write_text(json.dumps({"version": "0.3.0"}))
    result = subprocess.run(
        [sys.executable, str(ROOT / "scripts/version.py"), "--tag-before", before],
        cwd=repository,
        capture_output=True,
        text=True,
    )
    assert result.returncode != 0
    assert "versions disagree" in result.stderr


def test_first_release_notes(repository: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """First-release evidence uses the empty Git tree without waiting for stdin."""
    monkeypatch.chdir(repository)
    subprocess.run(["git", "tag", "-d", "v0.2.0"], check=True, capture_output=True)
    subprocess.run(["git", "tag", "v0.1.0"], check=True)
    context = notes.release_context("v0.1.0", None)
    assert "chore: initial" in context
    assert "package.json" in context


def test_generate_notes_retries_and_replaces_stale_output(
    repository: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Exercise generation without a network call or real Copilot credential."""
    subprocess.run(
        ["git", "commit", "--allow-empty", "--quiet", "-m", "feat: add table editing"],
        cwd=repository,
        check=True,
    )
    subprocess.run(["git", "tag", "v0.3.0"], cwd=repository, check=True)
    output = repository / "release-notes.md"
    output.write_text("Stale notes must not be published")
    monkeypatch.chdir(repository)
    monkeypatch.setenv("COPILOT_GITHUB_TOKEN", "test-only-placeholder")
    monkeypatch.setattr(sys, "argv", ["release_notes.py", "--to-ref", "v0.3.0"])
    original_run = subprocess.run
    attempts: list[list[str]] = []

    def copilot_stub(
        command: list[str], **kwargs: object
    ) -> subprocess.CompletedProcess[str]:
        if command[:2] != ["gh", "copilot"]:
            return original_run(command, **kwargs)
        assert not output.exists()
        attempts.append(command)
        markdown = (
            "Invalid notes"
            if len(attempts) == 1
            else "## New Features\n\n- Edit tables."
        )
        events = [
            {
                "type": "assistant.message",
                "data": {"phase": "commentary", "content": "Working"},
            },
            {
                "type": "assistant.message",
                "data": {"phase": "final_answer", "content": markdown},
            },
            {"type": "result", "exitCode": 0},
        ]
        return subprocess.CompletedProcess(
            command, 0, "\n".join(map(json.dumps, events)), ""
        )

    monkeypatch.setattr(subprocess, "run", copilot_stub)
    notes.main()
    assert len(attempts) == 2
    assert "--output-format" in attempts[0]
    assert (
        "previous output was rejected" in attempts[1][attempts[1].index("--prompt") + 1]
    )
    assert output.read_text() == "## New Features\n\n- Edit tables.\n"
