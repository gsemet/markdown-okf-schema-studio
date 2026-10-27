#!/usr/bin/env python3
"""Coverage map for the next exploratory campaign, in a few dozen lines.

Prints (1) what the automated suites already exercise, so charters skip it, and (2) the extension
files changed since the last campaign, mapped to use-case areas (references/use-cases.md).

Usage: python3 coverage-map.py [--since REV] [--campaign DIR]
"""
import argparse
import re
import subprocess
from collections import Counter, defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parents[4]
EXT = REPO

# Source path pattern -> use-case areas. First match wins; keep in step with use-cases.md.
AREAS = [
    (r"src/page/(runtime\.ts|features/)", "B2 D1 D2 D4 D7 E2 E3"),
    (r"src/page/modules/(markdownTable|textEditing)\.ts", "D1 D2 D3 D7"),
    (r"src/core/scroll/anchorPolicy\.ts", "B2 C1"),
    (r"src/page/modules/(linkNavigation|mermaidPreview)\.ts", "B3 C4"),
    (r"src/core/frontmatter/fileLinks\.ts", "E4 B3"),
    (r"src/core/frontmatter/", "E1 E2 E3 E5"),
    (r"src/core/preview/previewToolbar\.ts", "A1 B4"),
    (r"src/core/preview/", "B1 B4 B6"),
    (r"src/core/render/", "B1 C3 C4"),
    (r"src/node-services/build/", "C1 C2 C3 F2"),
    (r"src/(core/navigation/|session/previewNavigator\.ts|host-vscode/groupFocus\.ts)", "A3 B3"),
    (r"src/core/(state|configuration)/", "A4 F3"),
    (r"src/core/security/", "A5 B1"),
    (r"src/core/mapping/", "B2 D1"),
    (r"src/extension\.ts", "A1 A2 A3 A4 D5 D6 F1"),
    (r"package\.json", "A1 A2 F3"),
]


def git(*args):
    return subprocess.run(["git", "-C", str(REPO), *args], capture_output=True, text=True).stdout.strip()


def words(name):
    return re.sub(r"(?<!^)(?=[A-Z])", " ", name).lower()


def last_campaign_rev(campaign):
    """Most recent commit named in the campaign's index files (`commit `abc1234``)."""
    revs = []
    for index in sorted(Path(campaign).glob("**/00-index.md")):
        match = re.search(r"commit `([0-9a-f]{7,40})`", index.read_text(encoding="utf-8"))
        if match:
            revs.append(match.group(1))
    dated = [(git("show", "-s", "--format=%ct", rev), rev) for rev in revs]
    dated = [(int(t), rev) for t, rev in dated if t.isdigit()]
    return max(dated)[1] if dated else None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--since")
    parser.add_argument("--campaign", default=str(REPO / ".agents/changes/04-archives/001-deep-UX-analysis"))
    args = parser.parse_args()

    print("## Automated coverage (do not re-explore; extend instead)")
    real = EXT / "test/integration/realInput"
    if real.exists():
        names = re.findall(r"^(?:export )?async function scenario(\w+)",
                           "".join(f.read_text(encoding="utf-8") for f in sorted(real.glob("*.ts"))), re.M)
        print(f"real-input E2E ({len(names)}): " + "; ".join(words(n) for n in names))
    visual = sorted((EXT / "test/visual").glob("scenario*.ts"))
    if visual:
        text = "".join(path.read_text(encoding="utf-8") for path in visual)
        ids = re.findall(r"^\s+id: [\"']([\w-]+)", text, re.M)
        groups = Counter(i.split("-")[0] for i in ids)
        print(f"visual scenarios ({len(ids)}): " + ", ".join(f"{g}×{n}" for g, n in groups.most_common()))
    capture = sorted((EXT / "test/visual").glob("capture*.py"))
    if capture:
        text = "".join(path.read_text(encoding="utf-8") for path in capture)
        checks = re.findall(r"^def check_(\w+)", text, re.M)
        print(f"screenshot machine checks ({len(checks)}): " + ", ".join(checks))
    for suite in sorted((EXT / "test/integration").glob("*.test.ts")):
        titles = re.findall(r"\b(?:test|it)\(\s*[\"'`](.+?)[\"'`]", suite.read_text(encoding="utf-8"))
        if titles:
            shown = "; ".join(t[:60] for t in titles[:8]) + ("; …" if len(titles) > 8 else "")
            print(f"{suite.stem} ({len(titles)}): {shown}")

    since = args.since or last_campaign_rev(args.campaign)
    print()
    if not since:
        print("## Changes: no previous campaign revision found; explore every area")
        return
    count = git("rev-list", "--count", f"{since}..HEAD")
    print(f"## Changes since {since} ({count} commits)")
    files = [f for f in git("diff", "--name-only", f"{since}..HEAD").splitlines()
             if re.search(r"(?:src/|package\.json$)", f)]
    by_area = defaultdict(list)
    for file in files:
        rel = file
        for pattern, areas in AREAS:
            if re.search(pattern, rel):
                for area in areas.split():
                    by_area[area].append(Path(rel).name)
                break
        else:
            by_area["?"].append(rel)
    stat = git("diff", "--shortstat", f"{since}..HEAD", "--", "src")
    print(f"product sources: {stat or 'unchanged'}")
    for area in sorted(by_area):
        print(f"{area}: {', '.join(sorted(set(by_area[area])))}")
    untouched = sorted({a for _, areas in AREAS for a in areas.split()} - set(by_area))
    print(f"areas without product changes (lower priority unless never explored): {' '.join(untouched)}")


if __name__ == "__main__":
    main()
