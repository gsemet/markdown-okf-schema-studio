"""Focused tests for preview-only Sphinx source mapping."""

from __future__ import annotations

import os
from pathlib import Path
import re
import shutil
import subprocess
import sys


def _fixture_root() -> Path:
    return Path(__file__).resolve().parent / "fixtures" / "sphinx-preview-mapping"


def _without_mapping_attributes(html: str) -> str:
    return re.sub(r'\s+data-sphinx-[^=]+="[^"]*"', "", html)


def _build(
    tmp_path: Path,
    *,
    preview: bool,
    builder: str = "html",
) -> tuple[Path, subprocess.CompletedProcess[str]]:
    fixture = tmp_path / f"fixture-{builder}-{'preview' if preview else 'normal'}"
    shutil.copytree(_fixture_root(), fixture)
    output = tmp_path / f"output-{builder}-{'preview' if preview else 'normal'}"
    environment = os.environ.copy()
    environment.pop("SPHINX_PREVIEW_MODE", None)
    environment.pop("SPHINX_PREVIEW_ACTIVE_FILE", None)
    environment.pop("SPHINX_PREVIEW_ACTIVE_SOURCE", None)
    environment.pop("SPHINX_PREVIEW_DOCUMENT_ID", None)
    environment.pop("SPHINX_PREVIEW_SOURCE_ORIGINS", None)
    extension_directory = Path(__file__).resolve().parents[2] / "sphinx"
    environment["PYTHONPATH"] = os.pathsep.join(
        [str(extension_directory), environment.get("PYTHONPATH", "")]
    )
    if preview:
        environment.update(
            {
                "SPHINX_PREVIEW_MODE": "1",
                "SPHINX_PREVIEW_ACTIVE_FILE": str(fixture / "index.md"),
                "SPHINX_PREVIEW_ACTIVE_SOURCE": str(fixture / "index.md"),
                "SPHINX_PREVIEW_DOCUMENT_ID": "file:///fixture/index.md",
                "SPHINX_PREVIEW_SOURCE_ORIGINS": (
                    f'{{"{fixture / "index.md"}": "{fixture / "index.md"}"}}'
                ),
            }
        )
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "sphinx",
            "-W",
            "--keep-going",
            "-b",
            builder,
            "-c",
            str(fixture),
            str(fixture),
            str(output),
        ],
        capture_output=True,
        text=True,
        check=False,
        env=environment,
    )
    return output, result


def test_preview_html_maps_real_blocks_and_preserves_original_lines(tmp_path: Path) -> None:
    output, result = _build(tmp_path, preview=True)

    assert result.returncode == 0, result.stderr
    html = (output / "index.html").read_text(encoding="utf-8")
    assert html.count("data-sphinx-source-file=") >= 7
    assert 'data-sphinx-preview-document="file:///fixture/index.md"' in html
    assert 'data-sphinx-source-line="1"' in html
    assert 'data-sphinx-source-line="3"' in html
    assert "Generated preview banner" in html
    assert re.search(r"data-sphinx-source-line=\"(?:-\d+|0)\"", html) is None
    assert "This hidden block must not appear" not in html
    included_index = html.index("Included content has an origin")
    included_fragment = html[included_index - 400 : included_index + 160]
    assert "data-sphinx-source-file" not in included_fragment


def test_normal_html_has_no_preview_mapping_attributes(tmp_path: Path) -> None:
    output, result = _build(tmp_path, preview=False)

    assert result.returncode == 0, result.stderr
    html = (output / "index.html").read_text(encoding="utf-8")
    assert "data-sphinx-source-file" not in html
    assert "data-sphinx-source-line" not in html
    assert "Generated preview banner" in html


def test_preview_html_keeps_normal_body_output_unchanged(tmp_path: Path) -> None:
    preview_output, preview_result = _build(tmp_path, preview=True)
    normal_output, normal_result = _build(tmp_path, preview=False)

    assert preview_result.returncode == 0, preview_result.stderr
    assert normal_result.returncode == 0, normal_result.stderr
    preview_html = (preview_output / "index.html").read_text(encoding="utf-8")
    normal_html = (normal_output / "index.html").read_text(encoding="utf-8")

    assert _without_mapping_attributes(preview_html) == normal_html


def test_non_html_builder_has_no_preview_mapping_attributes(tmp_path: Path) -> None:
    output, result = _build(tmp_path, preview=True, builder="singlehtml")

    assert result.returncode == 0, result.stderr
    html = (output / "index.html").read_text(encoding="utf-8")
    assert "data-sphinx-source-file" not in html
    assert "data-sphinx-source-line" not in html
