"""Check the SwRS cited by the `### Main paths` section of every StRS of the requirements bundle.

Usage: check_main_paths.py <bundle root>

Every SwRS ID cited in the section must exist, be active (`draft`, `proposed` or `approved`) and
derive from the StRS that cites it. Prints one line per problem (`<path>:<line>: <message>`) and
exits 1, or prints a one-line summary and exits 0. The format is documented in
`requirements/guidelines/project.guidelines.md` ("Main paths of a StRS").
"""

from __future__ import annotations

import re
import sys
from typing import NamedTuple
from pathlib import Path

from ruamel.yaml import YAML

HEADING = "### Main paths"
LINKS_START = "<!-- okf:links:start -->"
ACTIVE = {"draft", "proposed", "approved"}


class Swrs(NamedTuple):
    lifecycle: str
    derives_from: tuple[str, ...]


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8").replace("\r\n", "\n").replace("\r", "\n")


def frontmatter(text: str) -> dict:
    lines = text.split("\n")
    if not lines or lines[0].strip() != "---":
        return {}
    for end in range(1, len(lines)):
        if lines[end].strip() == "---":
            data = YAML(typ="safe").load("\n".join(lines[1:end]))
            return data if isinstance(data, dict) else {}
    return {}


def load_config(root: Path) -> dict:
    data = YAML(typ="safe").load(read_text(root / "config.yml"))
    return data if isinstance(data, dict) else {}


def section_lines(text: str) -> list[tuple[int, str]]:
    """The (1-based line number, line) pairs of the Main paths section, heading excluded."""
    found: list[tuple[int, str]] = []
    inside = False
    for number, line in enumerate(text.split("\n"), start=1):
        if not inside:
            inside = line.strip() == HEADING
            continue
        if line.startswith("### ") or line.strip() == LINKS_START:
            break
        found.append((number, line))
    return found


def check(root: Path) -> tuple[list[str], int, int]:
    """Return (problems, StRS with a section, citations)."""
    config = load_config(root)
    tiers = config.get("tiers", {})
    strs_dir = root / "tiers" / tiers["StRS"]["folder"]
    swrs_dir = root / "tiers" / tiers["SwRS"]["folder"]
    swrs_prefix = tiers["SwRS"]["prefix"]
    id_pattern = re.compile(re.escape(swrs_prefix) + r"-[A-Za-z0-9]+-\d+")

    index: dict[str, Swrs] = {}
    for path in sorted(swrs_dir.rglob("*.md")):
        meta = frontmatter(read_text(path))
        if meta.get("id"):
            derives = meta.get("derives_from") or []
            if isinstance(derives, str):
                derives = [derives]
            index[str(meta["id"])] = Swrs(str(meta.get("req_lifecycle", "")), tuple(str(d) for d in derives))

    problems: list[str] = []
    checked = 0
    citations = 0
    for path in sorted(strs_dir.rglob("*.md")):
        text = read_text(path)
        lines = section_lines(text)
        if not lines:
            continue
        strs_id = str(frontmatter(text).get("id", path.stem))
        checked += 1
        for number, line in lines:
            for swrs_id in id_pattern.findall(line):
                citations += 1
                where = f"{path.as_posix()}:{number}"
                swrs = index.get(swrs_id)
                if swrs is None:
                    problems.append(f"{where}: {swrs_id} does not exist")
                    continue
                if swrs.lifecycle not in ACTIVE:
                    problems.append(f"{where}: {swrs_id} is {swrs.lifecycle}, not active")
                if strs_id not in swrs.derives_from:
                    problems.append(f"{where}: {swrs_id} does not derive from {strs_id}")
    return problems, checked, citations


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("usage: check_main_paths.py <bundle root>", file=sys.stderr)
        return 2
    problems, checked, citations = check(Path(argv[1]))
    if problems:
        print("\n".join(problems))
        print(f"main paths: {len(problems)} problem(s) in {checked} StRS with a section", file=sys.stderr)
        return 1
    print(f"main paths: {checked} StRS checked, {citations} SwRS citations, all valid")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
