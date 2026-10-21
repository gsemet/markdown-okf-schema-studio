"""Generate compact README images from the latest passing E2E captures."""

from __future__ import annotations

import argparse
import re
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SCREENSHOTS = ROOT / "out" / "reports" / "e2e" / "screenshots"
VISUAL = SCREENSHOTS / "visual"
OUTPUT = ROOT / "images" / "readme"


@dataclass(frozen=True)
class Crop:
    source: Path
    destination: str
    box: tuple[int, int, int, int]
    width: int


def latest_real_input_directory() -> Path:
    pointer = SCREENSHOTS / "REAL-INPUT-LATEST.md"
    content = pointer.read_text(encoding="utf-8")
    if "Suite: **passed**" not in content:
        raise RuntimeError("latest real-input E2E suite did not pass")
    match = re.search(r"\[Ordered captures\]\(([^)]+)/INDEX\.md\)", content)
    if match is None:
        raise RuntimeError("latest real-input pointer has no capture directory")
    directory = (SCREENSHOTS / match.group(1)).resolve()
    if directory.parent != SCREENSHOTS.resolve() or not directory.name.startswith("real-input-"):
        raise RuntimeError("latest real-input pointer escapes the screenshot directory")
    return directory


def render(crop: Crop, output: Path = OUTPUT) -> None:
    if not crop.source.is_file():
        raise FileNotFoundError(f"required E2E capture is missing: {crop.source}")
    with Image.open(crop.source) as source:
        image = source.convert("RGB").crop(crop.box)
        height = round(image.height * crop.width / image.width)
        image = image.resize((crop.width, height), Image.Resampling.LANCZOS)
        image.save(output / crop.destination, optimize=True)


def pixels_equal(first: Path, second: Path) -> bool:
    with Image.open(first) as left, Image.open(second) as right:
        return left.convert("RGB").size == right.convert("RGB").size \
            and left.convert("RGB").tobytes() == right.convert("RGB").tobytes()


def check(baseline: Path) -> int:
    """Re-render the images whose source is a visual (static page) capture into a temp directory
    and compare them pixel for pixel with the images of `baseline`. Real-window sources are skipped."""
    crops = [crop for crop in build_crops(None) if crop.source.is_relative_to(VISUAL)]
    differences = 0
    with tempfile.TemporaryDirectory() as temporary:
        for crop in crops:
            render(crop, Path(temporary))
            expected = baseline / crop.destination
            if not expected.is_file() or not pixels_equal(Path(temporary) / crop.destination, expected):
                print(f"DIFFERS: {crop.destination} (source {crop.source.name})")
                differences += 1
            else:
                print(f"identical: {crop.destination}")
    print(f"{len(crops)} visual-sourced README images checked, {differences} differences")
    return 1 if differences else 0


def build_crops(real_input: Path | None) -> list[Crop]:
    real_input = real_input or SCREENSHOTS / "_real-input-unavailable"
    return [
        Crop(real_input / "05-open-with-editor.png", "open-with-editor.png", (250, 55, 1400, 470), 760),
        Crop(real_input / "36-title-bar-button.png", "open-preview-to-side.png", (40, 35, 1390, 430), 760),
        Crop(real_input / "39-quick-open-beside-preview.png", "preview-beside-editor.png", (45, 35, 1395, 420), 760),
        Crop(VISUAL / "frontmatter-schema/v05-okf-schema-table-dark-900.png", "schema-properties.png", (120, 20, 1680, 1100), 720),
        Crop(VISUAL / "frontmatter-editing/v02-edit-enum-value-dark-900.png", "edit-frontmatter.png", (120, 20, 1680, 1110), 720),
        Crop(real_input / "22-editor-frame-and-buttons.png", "inline-editing.png", (700, 40, 1390, 410), 720),
        Crop(real_input / "38-edit-mode-remembered.png", "myst-admonitions.png", (790, 140, 1315, 445), 720),
        Crop(real_input / "38-edit-mode-remembered.png", "myst-diagrams-and-figure.png", (790, 460, 1315, 860), 720),
        Crop(VISUAL / "rendering-core/v01-handbook-top-dark-900.png", "theme-dark.png", (0, 20, 1800, 930), 720),
        Crop(VISUAL / "theme-zoom/v01-forced-white-handbook-white-900.png", "theme-white.png", (0, 20, 1800, 930), 720),
        Crop(VISUAL / "theme-zoom/v02-forced-cream-handbook-cream-900.png", "theme-cream.png", (0, 20, 1800, 930), 720),
        Crop(VISUAL / "layout-width/v84-break-auto-readme-cream-1200.png", "margin-break-cream.png", (0, 0, 2400, 1800), 1200),
        Crop(VISUAL / "toolbar-navigation/v18-toolbar-expanded-cream-900.png", "toolbar-expanded.png", (1440, 0, 1800, 260), 360),
        Crop(VISUAL / "toolbar-navigation/v19-toolbar-collapsed-cream-900.png", "toolbar-collapsed.png", (1440, 0, 1800, 260), 360),
        Crop(VISUAL / "palette-slash/v12-slash-gfm-light-900.png", "slash-menu.png", (140, 780, 1660, 1800), 760),
    ]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", type=Path, metavar="BASELINE_DIR",
                        help="compare the visual-sourced images with this directory instead of writing images/readme")
    arguments = parser.parse_args()
    if arguments.check is not None:
        return check(arguments.check)
    real_input = latest_real_input_directory()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    crops = build_crops(real_input)
    for crop in crops:
        render(crop)
    print(f"Generated {len(crops)} README images in {OUTPUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
