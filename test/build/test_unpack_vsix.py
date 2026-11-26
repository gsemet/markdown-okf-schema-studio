"""scripts/unpack_vsix.py: the extension of a built VSIX, unpacked for the acceptance window that runs it."""

from __future__ import annotations

import subprocess
import sys
import zipfile
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "unpack_vsix.py"


def _vsix(path: Path, members: dict[str, bytes]) -> Path:
    with zipfile.ZipFile(path, "w") as archive:
        for name, content in members.items():
            archive.writestr(name, content)
    return path


def _unpack(vsix: Path, folder: Path) -> subprocess.CompletedProcess[str]:
    # -I: the way the acceptance runner starts it, with nothing of the current folder on the path.
    return subprocess.run([sys.executable, "-I", str(SCRIPT), str(vsix), str(folder)], capture_output=True, text=True)


def _files(folder: Path) -> dict[str, bytes]:
    return {path.relative_to(folder).as_posix(): path.read_bytes() for path in folder.rglob("*") if path.is_file()}


# @tests_req SwRS-MDOKFSTUDIO-CORE-076#S7
def test_only_the_extension_folder_is_unpacked_without_its_prefix(tmp_path: Path) -> None:
    vsix = _vsix(tmp_path / "studio.vsix", {
        "extension.vsixmanifest": b"<manifest/>",
        "[Content_Types].xml": b"<types/>",
        "extension/": b"",
        "extension/package.json": b'{"name": "studio"}',
        "extension/out/src/extension.js": b"exports.activate = 1;\r\n",
    })
    folder = tmp_path / "installed" / "extension"
    result = _unpack(vsix, folder)
    assert result.returncode == 0, result.stderr
    assert _files(folder) == {"package.json": b'{"name": "studio"}', "out/src/extension.js": b"exports.activate = 1;\r\n"}
    assert "unpack_vsix: 2 files of " in result.stdout


# @tests_req SwRS-MDOKFSTUDIO-CORE-076#S7
@pytest.mark.parametrize("name", ["extension/../outside.txt", "extension//root.txt", "extension/..\\outside.txt", "extension/C:/x"])
def test_a_member_that_would_leave_the_folder_stops_before_anything_is_written(tmp_path: Path, name: str) -> None:
    # On Windows zipfile stores a backslash as a slash: the name is refused either way.
    vsix = _vsix(tmp_path / "bad.vsix", {"extension/package.json": b"{}", name: b"planted"})
    folder = tmp_path / "installed"
    result = _unpack(vsix, folder)
    assert result.returncode == 1, result.stdout
    assert "unpack_vsix: FAILED:" in result.stderr and "would leave the destination folder" in result.stderr
    assert not folder.exists()
    assert not (tmp_path / "outside.txt").exists()


# @tests_req SwRS-MDOKFSTUDIO-CORE-076#S7
def test_a_folder_that_holds_something_and_a_file_that_is_no_vsix_are_refused(tmp_path: Path) -> None:
    good = _vsix(tmp_path / "good.vsix", {"extension/package.json": b"{}"})
    used = tmp_path / "used"
    used.mkdir()
    (used / "left.txt").write_text("left")
    result = _unpack(good, used)
    assert result.returncode == 1 and "is not empty" in result.stderr
    assert _files(used) == {"left.txt": b"left"}

    other = _vsix(tmp_path / "other.zip", {"package.json": b"{}"})
    result = _unpack(other, tmp_path / "a")
    assert result.returncode == 1 and "it is not a VSIX" in result.stderr
    assert not (tmp_path / "a").exists()

    text = tmp_path / "text.vsix"
    text.write_text("not a zip")
    for missing_or_broken in (text, tmp_path / "absent.vsix"):
        result = _unpack(missing_or_broken, tmp_path / "b")
        assert result.returncode == 1 and "unpack_vsix: FAILED:" in result.stderr


def test_the_arguments_are_the_vsix_and_the_folder(tmp_path: Path) -> None:
    result = subprocess.run([sys.executable, "-I", str(SCRIPT), str(tmp_path / "only.vsix")], capture_output=True, text=True)
    assert result.returncode == 2 and "usage: unpack_vsix.py <vsix> <folder>" in result.stderr
