"""Unpack the `extension/` folder of a built VSIX, for the acceptance window that runs it.

Usage: unpack_vsix.py <vsix> <folder>

The members under `extension/` are written into <folder> without that prefix, so <folder> is the
extension's root (its `package.json` is at the top). <folder> is created, and refused when it
already holds something. The other members of the VSIX (its manifest, its content types) are left
out. A member whose name would leave <folder> fails the run before anything is written.
Standard library only: it runs with `uv run --no-sync python -I` on Linux, macOS and Windows.
"""

from __future__ import annotations

import sys
import zipfile
from pathlib import Path, PurePosixPath

PREFIX = "extension/"


def extension_members(archive: zipfile.ZipFile) -> list[tuple[zipfile.ZipInfo, PurePosixPath]]:
    """The files under `extension/`, each with its path relative to the extension root."""
    members: list[tuple[zipfile.ZipInfo, PurePosixPath]] = []
    for info in archive.infolist():
        if info.is_dir() or not info.filename.startswith(PREFIX):
            continue
        name = info.filename[len(PREFIX) :]
        relative = PurePosixPath(name)
        if relative.is_absolute() or ".." in relative.parts or "\\" in name or ":" in name:
            raise ValueError(f"{info.filename!r} would leave the destination folder")
        members.append((info, relative))
    return members


# @implements_req SwRS-MDOKFSTUDIO-CORE-076
def unpack(vsix: Path, folder: Path) -> int:
    """Writes the extension of `vsix` into `folder`; returns the number of files written."""
    if folder.exists() and any(folder.iterdir()):
        raise ValueError(f"{folder} is not empty")
    with zipfile.ZipFile(vsix) as archive:
        members = extension_members(archive)
        if not any(str(relative) == "package.json" for _, relative in members):
            raise ValueError(f"{vsix} holds no {PREFIX}package.json: it is not a VSIX")
        for info, relative in members:
            target = folder.joinpath(*relative.parts)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(archive.read(info))
    return len(members)


def main(arguments: list[str]) -> int:
    if len(arguments) != 2:
        print("usage: unpack_vsix.py <vsix> <folder>", file=sys.stderr)
        return 2
    vsix, folder = Path(arguments[0]), Path(arguments[1])
    try:
        count = unpack(vsix, folder)
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        print(f"unpack_vsix: FAILED: {error}", file=sys.stderr)
        return 1
    print(f"unpack_vsix: {count} files of {vsix} in {folder}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
