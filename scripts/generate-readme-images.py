"""Generate compact README images from the latest passing E2E captures."""

from __future__ import annotations

import argparse
import json
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
# Written by `npm run visual:render`; its scenarios carry the `readme` metadata (file, crop, width).
RENDER_MANIFEST = ROOT / "out" / "reports" / "visual" / "manifest.json"


@dataclass(frozen=True)
class Crop:
    source: Path
    destination: str
    box: tuple[int, int, int, int]
    width: int


def latest_real_input_directory() -> Path:
    """Run folder named by REAL-INPUT-LATEST.md; captures are at `<group>/<rNN-slug>.png` inside it."""
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


def real_crops(real_input: Path) -> list[Crop]:
    """Crops of the real-window captures, from the `readme` entries of `test/shared/captureRegistry.ts`
    (carried by the render manifest as `realCaptures`)."""
    if not RENDER_MANIFEST.is_file():
        raise RuntimeError(f"{RENDER_MANIFEST.relative_to(ROOT)} is missing: run `npm run visual:render`")
    captures = json.loads(RENDER_MANIFEST.read_text(encoding="utf-8")).get("realCaptures", [])
    crops = []
    for capture in captures:
        for source in capture.get("readme", []):
            if capture.get("capture") is False:
                raise RuntimeError(f"README source {capture['id']} is assertion-only")
            crops.append(Crop(real_input / f"{capture['id']}.png", source["file"], tuple(source["crop"]), source["width"]))
    return crops


def check(baseline: Path, visual_only: bool = False) -> int:
    """Re-render the README images into a temp directory and compare them pixel for pixel with the
    images of `baseline`: the visual-sourced ones always, the real-window ones when the latest
    real-input run passed (otherwise they are reported as skipped; `visual_only` skips them)."""
    crops = visual_crops()
    if not visual_only:
        try:
            crops += real_crops(latest_real_input_directory())
        except (OSError, RuntimeError) as error:
            print(f"real-window README images skipped: {error}")
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
    print(f"{len(crops)} README images checked, {differences} differences")
    return 1 if differences else 0


def visual_crops() -> list[Crop]:
    """Crops of the scenario PNGs, from the `readme` metadata of `test/visual/scenarios.ts`."""
    if not RENDER_MANIFEST.is_file():
        raise RuntimeError(f"{RENDER_MANIFEST.relative_to(ROOT)} is missing: run `npm run visual:render`")
    scenarios = json.loads(RENDER_MANIFEST.read_text(encoding="utf-8"))["scenarios"]
    crops = []
    for scenario in scenarios:
        readme = scenario.get("readme")
        if readme is None:
            continue
        if scenario.get("capture") is False:
            raise RuntimeError(f"README source {scenario['id']} is assertion-only")
        if readme.get("step"):
            raise RuntimeError(f"README source {scenario['id']}: step sources are not supported")
        crops.append(Crop(VISUAL / f"{scenario['id']}.png", readme["file"], tuple(readme["crop"]), readme["width"]))
    return crops


def build_crops(real_input: Path | None) -> list[Crop]:
    """Visual crops in README order, then the real-window ones from the capture registry."""
    real_input = real_input or SCREENSHOTS / "_real-input-unavailable"
    return visual_crops() + real_crops(real_input)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", type=Path, metavar="BASELINE_DIR",
                        help="compare the visual-sourced images with this directory instead of writing images/readme")
    parser.add_argument("--visual-only", action="store_true",
                        help="write (or with --check, compare) only the images cropped from the headless visual "
                             "scenarios; skips the real-window crops and does not need REAL-INPUT-LATEST.md")
    parser.add_argument("--real-only", action="store_true",
                        help="write only the six images cropped from the real-window captures of the latest "
                             "passing real-input run; does not need the headless visual PNGs")
    arguments = parser.parse_args()
    if arguments.visual_only and arguments.real_only:
        parser.error("--visual-only and --real-only exclude each other")
    if arguments.check is not None:
        return check(arguments.check, arguments.visual_only)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    if arguments.visual_only:
        crops = visual_crops()
    elif arguments.real_only:
        crops = real_crops(latest_real_input_directory())
    else:
        crops = build_crops(latest_real_input_directory())
    for crop in crops:
        render(crop)
    print(f"Generated {len(crops)} README images in {OUTPUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
