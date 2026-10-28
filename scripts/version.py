"""Update npm versions and create a signed-off version commit without tagging."""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from commitizen.config import read_cfg
from commitizen.providers.npm_provider import NpmProvider

# @implements_req SwRS-MDOKFSTUDIO-CORE-075
# Plugin manifests whose "version" always equals package.json (Claude Code and Agent Plugins).
PLUGIN_MANIFESTS = ("plugin.json", ".claude-plugin/plugin.json")
VERSIONED_PATHS = ("package.json", "package-lock.json", *PLUGIN_MANIFESTS)

VERSION = re.compile(r"(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)")


def version_tuple(value: str) -> tuple[int, ...]:
    """Validate a stable version and return its numeric components."""
    if not VERSION.fullmatch(value):
        raise ValueError(
            f"Expected X.Y.Z without a prefix or leading zeroes: {value!r}"
        )
    return tuple(map(int, value.split(".")))


def set_manifest_version(path: Path, version: str) -> None:
    """Rewrite the "version" of a JSON manifest, keeping its other keys and order."""
    manifest = json.loads(path.read_text())
    manifest["version"] = version
    path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")


def git(*arguments: str) -> str:
    """Run Git in the current checkout."""
    return subprocess.check_output(["git", *arguments], text=True).strip()


def tag_release(before: str) -> str | None:
    """Push a missing release tag only when the pushed npm version increased."""
    if not re.fullmatch(r"[0-9a-f]{40,64}", before):
        raise ValueError("Expected the previous push SHA")
    manifest = json.loads(Path("package.json").read_text())
    version = manifest["version"]
    version_tuple(version)
    previous = (
        None
        if set(before) == {"0"}
        else json.loads(git("show", f"{before}:package.json"))["version"]
    )
    if previous == version:
        print("Package version unchanged; no release tag needed.")
        return None
    if previous and version_tuple(version) <= version_tuple(previous):
        raise ValueError(f"Release version must increase: {previous} -> {version}")
    lock = json.loads(Path("package-lock.json").read_text())
    if lock["version"] != version or lock["packages"][""]["version"] != version:
        raise ValueError("package.json and package-lock.json versions disagree")
    tag = f"v{version}"
    if git("ls-remote", "--refs", "origin", f"refs/tags/{tag}"):
        print(f"Tag {tag} already exists; leaving it unchanged.")
        return None
    released = [
        entry[1:]
        for entry in git("tag", "--merged", "HEAD").splitlines()
        if entry.startswith("v") and VERSION.fullmatch(entry[1:])
    ]
    if released and version_tuple(version) <= max(map(version_tuple, released)):
        raise ValueError(
            "Release version must be newer than existing ancestor release tags"
        )
    git("push", "origin", f"HEAD:refs/tags/{tag}")
    return tag


def main() -> int:
    """Calculate or set the next release version."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("version", nargs="?")
    parser.add_argument(
        "--tag-before", help="CI only: tag a version change since this push SHA"
    )
    arguments = parser.parse_args()
    try:
        if arguments.tag_before:
            tag = tag_release(arguments.tag_before)
            if tag and os.environ.get("GITHUB_OUTPUT"):
                with Path(os.environ["GITHUB_OUTPUT"]).open("a") as output:
                    output.write(f"tag={tag}\n")
            return 0
        current = json.loads(Path("package.json").read_text())["version"]
        tags = git("tag", "--merged", "HEAD").splitlines()
        released = [
            tag[1:]
            for tag in tags
            if tag.startswith("v") and VERSION.fullmatch(tag[1:])
        ]
        baseline = max([current, *released], key=version_tuple)
        if arguments.version:
            next_version = arguments.version
        else:
            settings = dict(read_cfg().settings)
            settings.update(version=baseline, version_provider="commitizen")
            with tempfile.TemporaryDirectory(prefix="studio-version-") as directory:
                config = Path(directory) / ".cz.json"
                config.write_text(json.dumps({"commitizen": settings}))
                result = subprocess.run(
                    [
                        sys.executable,
                        "-m",
                        "commitizen",
                        "--config",
                        str(config),
                        "bump",
                        "--get-next",
                        "--yes",
                        "--allow-no-commit",
                    ],
                    capture_output=True,
                    text=True,
                    check=True,
                )
                next_version = result.stdout.strip().splitlines()[-1]
        if version_tuple(next_version) <= version_tuple(baseline):
            raise ValueError(f"Version must be newer than {baseline}: {next_version}")
        if git("tag", "--list", f"v{next_version}"):
            raise ValueError(f"Tag v{next_version} already exists")
        if git("status", "--porcelain", "--", *VERSIONED_PATHS):
            raise ValueError(
                "Commit or stash existing npm manifest edits (package and plugin manifests) before changing the version"
            )
        git("var", "GIT_AUTHOR_IDENT")
        git("var", "GIT_COMMITTER_IDENT")
        NpmProvider(read_cfg()).set_version(next_version)
        for name in PLUGIN_MANIFESTS:
            set_manifest_version(Path(name), next_version)
        print(f"Updated npm and plugin versions: {current} -> {next_version}")
        git(
            "commit",
            "--only",
            "-s",
            "-m",
            f"chore: version {next_version}",
            "--",
            *VERSIONED_PATHS,
        )
        print(f"Created signed-off commit: chore: version {next_version}")
        print("CI creates the tag after merge.")
        return 0
    except (ValueError, subprocess.CalledProcessError) as error:
        print(getattr(error, "stderr", None) or str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
