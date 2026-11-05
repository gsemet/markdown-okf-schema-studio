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

# @tests_req SwRS-MDOKFSTUDIO-CORE-075

ROOT = Path(__file__).resolve().parents[2]
PLUGIN_MANIFESTS = ("plugin.json", ".claude-plugin/plugin.json")
PLUGIN_CATALOGS = (".github/plugin/marketplace.json",)


def catalog_versions(path: Path) -> list[str]:
    """The version of every plugin entry of a marketplace catalog."""
    return [entry["version"] for entry in json.loads(path.read_text())["plugins"]]

spec = importlib.util.spec_from_file_location(
    "release_notes", ROOT / "scripts/release_notes.py"
)
assert spec and spec.loader
notes = importlib.util.module_from_spec(spec)
spec.loader.exec_module(notes)

NOTES = "<h1>Studio 0.2</h1>\n\n![Table](table.png)\n\n<img src=\"dark.png\" alt=\"Dark\">\n"


def write_notes(root: Path, version: str = "0.2.0", text: str = NOTES) -> Path:
    """A dated notes folder with the images of the default notes."""
    folder = root / f"docs/releases-notes/2026-01-02-v{version}"
    folder.mkdir(parents=True)
    (folder / "release-notes.md").write_text(text, encoding="utf-8")
    for name in ("table.png", "dark.png"):
        (folder / name).write_bytes(b"image")
    return folder


def run_notes(cwd: Path, *arguments: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(ROOT / "scripts/release_notes.py"), *arguments],
        cwd=cwd,
        text=True,
        capture_output=True,
    )


# @tests_req SwRS-MDOKFSTUDIO-CORE-078
def test_check_accepts_the_notes_of_the_package_version(tmp_path: Path) -> None:
    (tmp_path / "package.json").write_text(json.dumps({"version": "0.2.0"}))
    write_notes(tmp_path)
    result = run_notes(tmp_path, "--check")
    assert result.returncode == 0, result.stderr


# @tests_req SwRS-MDOKFSTUDIO-CORE-078
def test_check_refuses_a_version_without_notes(tmp_path: Path) -> None:
    (tmp_path / "package.json").write_text(json.dumps({"version": "0.3.0"}))
    write_notes(tmp_path)
    result = run_notes(tmp_path, "--check")
    assert result.returncode == 1
    assert "2026" not in result.stderr and "v0.3.0" in result.stderr


# @tests_req SwRS-MDOKFSTUDIO-CORE-078
def test_check_refuses_two_folders_for_a_version(tmp_path: Path) -> None:
    (tmp_path / "package.json").write_text(json.dumps({"version": "0.2.0"}))
    folder = write_notes(tmp_path)
    shutil.copytree(folder, folder.with_name("2026-01-03-v0.2.0"))
    assert run_notes(tmp_path, "--check").returncode == 1


# @tests_req SwRS-MDOKFSTUDIO-CORE-078
@pytest.mark.parametrize(
    "markdown",
    [
        "",
        "No title\n",
        "# Studio 0.1\n",
        "# Studio 0.2\n\n![Gone](missing.png)\n",
        "# Studio 0.2\n\n![Branch](https://example.com/branch/table.png)\n",
        '# Studio 0.2\n\n<img src="https://example.com/branch/table.png">\n',
        "# Studio 0.2\n\n![Nested](images/table.png)\n",
    ],
)
def test_check_refuses_invalid_notes(tmp_path: Path, markdown: str) -> None:
    """Fail closed instead of publishing notes that nobody can read as reviewed."""
    (tmp_path / "package.json").write_text(json.dumps({"version": "0.2.0"}))
    write_notes(tmp_path, text=markdown)
    assert run_notes(tmp_path, "--check").returncode == 1


# @tests_req SwRS-MDOKFSTUDIO-CORE-078
def test_prepare_points_the_images_to_the_release_assets(tmp_path: Path) -> None:
    write_notes(tmp_path)
    assets = tmp_path / "assets"
    result = run_notes(tmp_path, "--prepare", "v0.2.0", "--assets", str(assets))
    assert result.returncode == 0, result.stderr
    published = (tmp_path / "release-notes.md").read_text(encoding="utf-8")
    base = "https://github.com/gsemet/markdown-okf-schema-studio/releases/download/v0.2.0"
    assert f"![Table]({base}/table.png)" in published
    assert f'<img src="{base}/dark.png" alt="Dark">' in published
    assert sorted(path.name for path in assets.iterdir()) == ["dark.png", "table.png"]


# @tests_req SwRS-MDOKFSTUDIO-CORE-078
@pytest.mark.parametrize("tag", ["0.2.0", "v0.2", "v0.2.0-rc1", "v0.3.0"])
def test_prepare_refuses_a_tag_without_notes(tmp_path: Path, tag: str) -> None:
    write_notes(tmp_path)
    assert run_notes(tmp_path, "--prepare", tag).returncode == 1
    assert not (tmp_path / "release-notes.md").exists()


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
    (tmp_path / ".claude-plugin").mkdir()
    for name in PLUGIN_MANIFESTS:
        (tmp_path / name).write_text(json.dumps({"name": "demo", "version": "0.2.0"}))
    for name in PLUGIN_CATALOGS:
        (tmp_path / name).parent.mkdir(parents=True)
        (tmp_path / name).write_text(
            json.dumps(
                {
                    "name": "demo",
                    "owner": {"name": "Release Test"},
                    "plugins": [{"name": "demo", "source": "./", "version": "0.2.0"}],
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
    """Classify commits and create a signed-off version commit without a tag."""
    if message:
        subprocess.run(
            ["git", "commit", "--allow-empty", "--quiet", "-m", message],
            cwd=repository,
            check=True,
        )
    assert_version(repository, [], expected)


def assert_version(repository: Path, arguments: list[str], expected: str) -> None:
    """Check synchronized versions and the isolated signed-off commit."""
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
        subprocess.check_output(["git", "rev-parse", "HEAD^"], cwd=repository) == before
    )
    message = subprocess.check_output(
        ["git", "log", "-1", "--format=%B"], cwd=repository, text=True
    )
    assert message.splitlines()[0] == f"chore: version {expected}"
    assert "Signed-off-by: Release Test <test@example.com>" in message
    changed = subprocess.check_output(
        ["git", "diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"],
        cwd=repository,
        text=True,
    ).splitlines()
    assert changed == sorted(
        ["package-lock.json", "package.json", *PLUGIN_MANIFESTS, *PLUGIN_CATALOGS]
    )
    for name in PLUGIN_MANIFESTS:
        assert json.loads((repository / name).read_text())["version"] == expected, name
    for name in PLUGIN_CATALOGS:
        assert catalog_versions(repository / name) == [expected], name
    for name in changed:
        assert b"\r\n" not in (repository / name).read_bytes(), name
    assert subprocess.check_output(["git", "tag"], cwd=repository).strip() == b"v0.2.0"


def test_explicit_version(repository: Path) -> None:
    """Allow maintainers to choose an increasing stable version."""
    assert_version(repository, ["2.3.4"], "2.3.4")


@pytest.mark.parametrize("arguments, expected", [([], "0.2.1"), (["2.3.4"], "2.3.4")])
def test_version_preserves_unrelated_work(
    repository: Path, arguments: list[str], expected: str
) -> None:
    """Keep unrelated staged and untracked work out of either version commit."""
    (repository / "unrelated.txt").write_text("Staged work")
    subprocess.run(["git", "add", "unrelated.txt"], cwd=repository, check=True)
    (repository / "untracked.txt").write_text("Unstaged work")
    assert_version(repository, arguments, expected)
    assert (
        subprocess.check_output(
            ["git", "diff", "--cached", "--name-only"], cwd=repository
        ).strip()
        == b"unrelated.txt"
    )
    assert (repository / "untracked.txt").read_text() == "Unstaged work"


@pytest.mark.parametrize("arguments", [[], ["2.3.4"]])
@pytest.mark.parametrize("staged", [False, True])
def test_version_rejects_existing_manifest_edits(
    repository: Path, arguments: list[str], staged: bool
) -> None:
    """Refuse to include pre-existing npm edits in the version commit."""
    manifest = repository / "package.json"
    manifest.write_text(json.dumps({"version": "0.2.0", "description": "User work"}))
    if staged:
        subprocess.run(["git", "add", "package.json"], cwd=repository, check=True)
    before = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repository)
    original = manifest.read_bytes()
    result = subprocess.run(
        [sys.executable, str(ROOT / "scripts/version.py"), *arguments],
        cwd=repository,
        capture_output=True,
        text=True,
    )
    assert result.returncode != 0
    assert "existing npm manifest edits" in result.stderr
    assert manifest.read_bytes() == original
    assert (
        subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repository) == before
    )


@pytest.mark.parametrize("name", [*PLUGIN_MANIFESTS, *PLUGIN_CATALOGS])
def test_version_rejects_existing_plugin_manifest_edits(
    repository: Path, name: str
) -> None:
    """Refuse to include pre-existing plugin manifest edits in the version commit."""
    manifest = repository / name
    manifest.write_text(json.dumps({"name": "demo", "version": "0.2.0", "x": 1}))
    original = manifest.read_bytes()
    result = subprocess.run(
        [sys.executable, str(ROOT / "scripts/version.py")],
        cwd=repository,
        capture_output=True,
        text=True,
    )
    assert result.returncode != 0
    assert "existing" in result.stderr
    assert manifest.read_bytes() == original


def test_stale_manifest(repository: Path) -> None:
    """Use the latest reachable release when the manifest is behind."""
    (repository / "package.json").write_text(json.dumps({"version": "0.1.1"}))
    subprocess.run(["git", "add", "package.json"], cwd=repository, check=True)
    subprocess.run(
        ["git", "commit", "--quiet", "-m", "chore: stale manifest"],
        cwd=repository,
        check=True,
    )
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



# @tests_req SwRS-MDOKFSTUDIO-CORE-076
def test_bump_since_reports_whether_the_push_changed_the_version(repository: Path, tmp_path: Path) -> None:
    """CI runs the heavy jobs on the push that tag-release would tag, and only on it."""
    before = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repository, text=True).strip()
    output = tmp_path / "outputs"
    environment = {**os.environ, "GITHUB_OUTPUT": str(output)}
    command = [sys.executable, str(ROOT / "scripts/version.py"), "--bump-since", before]
    unchanged = subprocess.run(command, cwd=repository, env=environment, text=True, capture_output=True)
    assert unchanged.returncode == 0, unchanged.stderr
    assert output.read_text() == "bump=false\n"
    output.unlink()
    assert_version(repository, ["0.3.0"], "0.3.0")
    changed = subprocess.run(command, cwd=repository, env=environment, text=True, capture_output=True)
    assert changed.returncode == 0, changed.stderr
    assert output.read_text() == "bump=true\n"
    output.unlink()
    first_push = subprocess.run([*command[:-1], "0" * 40], cwd=repository, env=environment, text=True, capture_output=True)
    assert first_push.returncode == 0, first_push.stderr
    assert output.read_text() == "bump=true\n"
    assert subprocess.run([*command[:-1], "not-a-sha"], cwd=repository, capture_output=True).returncode != 0
