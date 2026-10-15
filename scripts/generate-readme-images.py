"""Generate compact README images from the latest passing E2E captures."""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SCREENSHOTS = ROOT / "out" / "reports" / "e2e" / "screenshots"
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


def render(crop: Crop) -> None:
    if not crop.source.is_file():
        raise FileNotFoundError(f"required E2E capture is missing: {crop.source}")
    with Image.open(crop.source) as source:
        image = source.convert("RGB").crop(crop.box)
        height = round(image.height * crop.width / image.width)
        image = image.resize((crop.width, height), Image.Resampling.LANCZOS)
        image.save(OUTPUT / crop.destination, optimize=True)


def main() -> None:
    real_input = latest_real_input_directory()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    crops = [
        Crop(real_input / "05-open-with-editor.png", "open-with-editor.png", (250, 55, 1400, 470), 760),
        Crop(real_input / "36-title-bar-button.png", "open-preview-to-side.png", (40, 35, 1390, 430), 760),
        Crop(real_input / "39-quick-open-beside-preview.png", "preview-beside-editor.png", (45, 35, 1395, 420), 760),
        Crop(SCREENSHOTS / "okf-schema-dark.png", "schema-properties.png", (120, 20, 1680, 1100), 720),
        Crop(SCREENSHOTS / "edit-frontmatter-value-dark.png", "edit-frontmatter.png", (120, 20, 1680, 1110), 720),
        Crop(real_input / "22-editor-frame-and-buttons.png", "inline-editing.png", (700, 40, 1390, 410), 720),
        Crop(real_input / "38-edit-mode-remembered.png", "myst-admonitions.png", (790, 140, 1315, 445), 720),
        Crop(real_input / "38-edit-mode-remembered.png", "myst-diagrams-and-figure.png", (790, 460, 1315, 860), 720),
        Crop(SCREENSHOTS / "handbook-dark-top.png", "theme-dark.png", (0, 20, 1800, 930), 720),
        Crop(SCREENSHOTS / "handbook-forced-white.png", "theme-white.png", (0, 20, 1800, 930), 720),
        Crop(SCREENSHOTS / "handbook-forced-cream.png", "theme-cream.png", (0, 20, 1800, 930), 720),
    ]
    for crop in crops:
        render(crop)
    print(f"Generated {len(crops)} README images in {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
