"""Add the commit of each line of `## Unreleased` in CHANGELOG.md, at release time.

Uses Git only: the commit that added a line is found with `git blame`, and must be on the base.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

CHANGELOG = Path("CHANGELOG.md")
# An item of a reference group: the commit, a change request, a pull request, a merge request or an issue.
ITEM = re.compile(r"(commit |CR-|PR #|MR !|issue )")
GROUP = re.compile(r"\(([^()]*)\)$")


class RefsError(Exception):
    """A line cannot get its commit: nothing is written."""


def git(*arguments: str) -> str:
    """Run Git in the current checkout."""
    return subprocess.check_output(["git", *arguments], text=True).strip()


def on_base(commit: str, base: str) -> bool:
    """Whether the commit is an ancestor of the base."""
    result = subprocess.run(
        ["git", "merge-base", "--is-ancestor", commit, base],
        capture_output=True,
        text=True,
    )
    if result.returncode > 1:
        raise RefsError(result.stderr.strip() or f"Cannot compare with {base}")
    return result.returncode == 0


def bullets(lines: list[str]) -> list[tuple[int, int]]:
    """The (first, last) line indexes of each bullet of `## Unreleased`."""
    start = next(
        (index for index, line in enumerate(lines) if line.strip() == "## Unreleased"),
        None,
    )
    if start is None:
        return []
    found: list[tuple[int, int]] = []
    for index in range(start + 1, len(lines)):
        line = lines[index]
        if line.startswith("## "):
            break
        if line.startswith("- "):
            found.append((index, index))
        elif found and line.startswith((" ", "\t")) and line.strip():
            found[-1] = (found[-1][0], index)
    return found


def reference_group(line: str) -> re.Match[str] | None:
    """The final reference group of a line, when every item is a reference."""
    match = GROUP.search(line)
    if match and all(ITEM.match(item) for item in match.group(1).split(", ")):
        return match
    return None


def with_commit(line: str, short: str) -> str:
    """The last line of a bullet with the commit item added."""
    match = reference_group(line)
    if match:
        return f"{line[: match.start(1)]}commit {short}, {line[match.start(1):]}"
    return f"{line} (commit {short})"


def first_words(line: str) -> str:
    """The first words of a bullet, to name it in messages."""
    return " ".join(line[2:].split()[:6])


def blame_commit(number: int) -> str:
    """The commit that added line `number` (1-based) of CHANGELOG.md at HEAD."""
    output = git("blame", "--porcelain", "-L", f"{number},{number}", "HEAD", "--", str(CHANGELOG))
    return output.split(maxsplit=1)[0]


def add_commits(lines: list[str], base: str, skip_missing: bool) -> tuple[list[str], list[str]]:
    """The lines with their commit items, and one report line per bullet changed or skipped."""
    result = list(lines)
    report: list[str] = []
    for first, last in bullets(lines):
        group = reference_group(lines[last])
        if group and group.group(1).startswith("commit "):
            continue
        sha = blame_commit(first + 1)
        if not on_base(sha, base):
            if skip_missing:
                report.append(f"skipped: {first_words(lines[first])}")
                continue
            raise RefsError(
                f"The commit {sha[:7]} of the line '{first_words(lines[first])}' is not on {base}"
            )
        short = git("rev-parse", "--short", sha)
        result[last] = with_commit(lines[last], short)
        report.append(f"commit {short}: {first_words(lines[first])}")
    return result, report


# @implements_req SwRS-MDOKFSTUDIO-CORE-094
def main() -> int:
    """Add the commit item to every line of `## Unreleased`."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default="origin/main", help="the branch the commits must be on")
    parser.add_argument(
        "--skip-missing",
        action="store_true",
        help="leave a line whose commit is not on the base unchanged, instead of stopping",
    )
    arguments = parser.parse_args()
    try:
        if git("status", "--porcelain", "--", str(CHANGELOG)):
            raise RefsError(f"{CHANGELOG} has uncommitted changes: commit or discard them first")
        text = CHANGELOG.read_bytes().decode("utf-8").replace("\r\n", "\n")
        lines = text.split("\n")
        updated, report = add_commits(lines, arguments.base, arguments.skip_missing)
    except (RefsError, subprocess.CalledProcessError) as error:
        print(getattr(error, "stderr", None) or str(error), file=sys.stderr)
        return 1
    changed = [line for line in report if not line.startswith("skipped: ")]
    if changed:
        CHANGELOG.write_bytes("\n".join(updated).encode("utf-8"))
    for line in report:
        print(line)
    print(f"{len(changed)} line(s) updated" if report else "No line to update")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
