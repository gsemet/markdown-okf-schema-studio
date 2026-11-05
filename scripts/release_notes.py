"""Validate the reviewed release notes and prepare them for the GitHub release."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from pathlib import Path

# @implements_req SwRS-MDOKFSTUDIO-CORE-078
NOTES_ROOT = Path("docs/releases-notes")
NOTES_FILE = "release-notes.md"
RELEASE_ASSETS = (
    "https://github.com/gsemet/markdown-okf-schema-studio/releases/download"
)
TAG = re.compile(r"v((0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*))")
IMAGE = re.compile(r'!\[[^\]]*\]\(([^)\s]+)[^)]*\)|<img\b[^>]*\bsrc="([^"]+)"')


def notes_file(version: str) -> Path:
    """Find the one notes file of a version, in its dated folder."""
    found = sorted(NOTES_ROOT.glob(f"[0-9]*-[0-9]*-[0-9]*-v{version}/{NOTES_FILE}"))
    if len(found) != 1:
        raise ValueError(
            f"Expected one {NOTES_ROOT.as_posix()}/YYYY-MM-DD-v{version}/{NOTES_FILE}, "
            f"found {len(found)}"
        )
    return found[0]


def images(notes: str) -> list[str]:
    """The source of every image of the notes, in order."""
    return [match.group(1) or match.group(2) for match in IMAGE.finditer(notes)]


def validate_notes(notes: str, folder: Path, version: str) -> None:
    """Reject notes of another version and images that the release cannot attach."""
    title = notes.strip().splitlines()[0] if notes.strip() else ""
    minor = ".".join(version.split(".")[:2])
    if not title.startswith(("# ", "<h1")) or minor not in title:
        raise ValueError(f"The notes must start with a title naming version {minor}")
    for source in images(notes):
        if "/" in source or not (folder / source).is_file():
            raise ValueError(f"Image next to the notes expected, found: {source}")


def public_notes(notes: str, tag: str) -> str:
    """Point the images of the notes to the assets of the release."""

    def attached(match: re.Match[str]) -> str:
        source = match.group(1) or match.group(2)
        return match.group(0).replace(source, f"{RELEASE_ASSETS}/{tag}/{source}")

    return IMAGE.sub(attached, notes)


def prepare(tag: str, output: Path, assets: Path) -> None:
    """Write the notes of a tag for the release, and copy their images to attach."""
    version = TAG.fullmatch(tag)
    if not version:
        raise ValueError("Expected a stable vX.Y.Z tag")
    path = notes_file(version.group(1))
    notes = path.read_text(encoding="utf-8")
    validate_notes(notes, path.parent, version.group(1))
    assets.mkdir(parents=True, exist_ok=True)
    for source in images(notes):
        shutil.copy(path.parent / source, assets / source)
    output.write_text(public_notes(notes, tag), encoding="utf-8", newline="\n")


def check() -> None:
    """Fail when the current package version has no valid notes."""
    version = json.loads(Path("package.json").read_text(encoding="utf-8"))["version"]
    path = notes_file(version)
    validate_notes(path.read_text(encoding="utf-8"), path.parent, version)
    print(f"release-notes: {path.as_posix()} ok")


def main() -> int:
    """Check the notes of the current version or prepare those of a tag."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--prepare", metavar="TAG")
    parser.add_argument("--output", type=Path, default=Path("release-notes.md"))
    parser.add_argument("--assets", type=Path, default=Path("release-assets"))
    arguments = parser.parse_args()
    if bool(arguments.check) == bool(arguments.prepare):
        parser.error("Use --check or --prepare")
    try:
        if arguments.check:
            check()
        else:
            prepare(arguments.prepare, arguments.output, arguments.assets)
    except ValueError as error:
        print(f"release-notes: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
