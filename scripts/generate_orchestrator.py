"""Rebuild ``03-requests/ORCHESTRATOR.md`` from the change-request tree.

Usage: ``generate_orchestrator.py [CHANGES] [--repo OWNER/NAME] [--output FILE] [--today YYYY-MM-DD]``
(``just orchestrator``). ``CHANGES`` is the changes root, default ``.agents/changes`` of the
repository (the parent of ``scripts/``).

Sources, all read from the changes root:

* Active: every ``03-requests/*/`` folder, from the four-line ``STATE.md`` header defined in
  ``.agents/guidelines/change-requests-lifecycle.guidelines.md``.
* Backlog: every ``02-backlog/P*/*/`` folder (priority, first file, its first H1, file count).
* Landed: every ``04-archives/NNN-*/`` folder, with the PR and date found in its ``report.md``.
* Notes: ``03-requests/ORCHESTRATOR-NOTES.md``, the only hand-written part, appended as is.

Exit codes: 0 on success (a drift warning alone exits 0); 1 when a CR has a missing ``STATE.md`` or
a header that does not match. The path is printed on stderr, the row is written with the status
``unparsable header`` (never guessed) and the file is still written before exiting 1; 2 for a bad
changes root or when the repository URL cannot be found.

Drift: a backlog item that is also the ``backlog-item/`` folder of a CR (same name once the CR's
``NNN-`` prefix is removed, or same first H1) is not listed in Backlog. It is listed under its CR,
named in a "Drift" list and reported as a ``warning: drift`` on stderr.

Idempotence: the alert carries the date of the last content change. When the existing output equals
the new content apart from that date, the file is not rewritten. Output order is deterministic.
"""

from __future__ import annotations

import argparse
import datetime
import json
import re
import sys
from pathlib import Path
from typing import NamedTuple

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CHANGES = ROOT / ".agents" / "changes"
UNPARSABLE = "⚠️ unparsable header"
ICONS = {"ready": "🟢", "working": "🟡", "wait-ci": "🟡", "blocked": "🔴", "landed": "✅"}
HEADER_PATTERNS = (
    re.compile(r"^driver: (?P<driver>.+?) · updated: (?P<updated>.+)$"),
    re.compile(
        r"^status: (?P<status>working|wait-ci|ready|blocked|landed) · step: (?P<step>.+?)"
        r" · round: (?P<round>.+)$"
    ),
    re.compile(r"^head: (?P<head>.+?) · PR: (?P<pr>.+?) · run: (?P<run>.+)$"),
    re.compile(r"^next: (?P<next>.+?) · question: (?P<question>.+)$"),
)
ALERT = re.compile(r"^> Updated \d{4}-\d{2}-\d{2}:", re.MULTILINE)
PREFIX = re.compile(r"^\d{3}\s*(?:—|-|:)\s*")
NNN = re.compile(r"^(\d{3})-")
DATE = re.compile(r"\d{4}-\d{2}-\d{2}")
PR_PATTERNS = (
    re.compile(r"/pull/(\d+)"),
    re.compile(r"\bPR:?\s*\[?#(\d+)"),
)


class Result(NamedTuple):
    text: str
    errors: list[str]
    warnings: list[str]


def parse_header(text: str) -> tuple[dict[str, str] | None, int]:
    """The four header fields, or (None, number of the first line that does not match)."""
    lines = text.splitlines()
    fields: dict[str, str] = {}
    for number, pattern in enumerate(HEADER_PATTERNS, start=1):
        line = lines[number - 1].rstrip() if number <= len(lines) else ""
        match = pattern.match(line)
        if not match:
            return None, number
        fields.update(match.groupdict())
    return fields, 0


def first_h1(path: Path) -> str | None:
    """First ``# `` heading outside YAML front matter and code fences."""
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except (OSError, UnicodeDecodeError):
        return None
    start = 0
    if lines and lines[0].strip() == "---":
        for index in range(1, len(lines)):
            if lines[index].strip() == "---":
                start = index + 1
                break
    fence = False
    for line in lines[start:]:
        if line.lstrip().startswith(("```", "~~~")):
            fence = not fence
        elif not fence and line.startswith("# "):
            return line[2:].strip()
    return None


def first_md(folder: Path) -> Path | None:
    files = sorted(p for p in folder.iterdir() if p.is_file() and p.suffix == ".md")
    return files[0] if files else None


def spec_file(folder: Path) -> Path | None:
    request = folder / "00-request.md"
    return request if request.is_file() else first_md(folder)


def subject(path: Path | None) -> str:
    title = first_h1(path) if path else None
    return PREFIX.sub("", title) if title else "—"


def cell(text: str) -> str:
    return text.replace("|", "\\|")


def number_of(name: str) -> int:
    match = NNN.match(name)
    return int(match.group(1)) if match else -1


def base_name(name: str) -> str:
    return NNN.sub("", name)


def pr_number(report: str) -> str | None:
    for pattern in PR_PATTERNS:
        match = pattern.search(report)
        if match:
            return match.group(1)
    return None


def repo_from_package(root: Path) -> str:
    data = json.loads((root / "package.json").read_text(encoding="utf-8"))
    repository = data.get("repository", {})
    url = repository.get("url", repository) if isinstance(repository, dict) else repository
    match = re.search(r"github\.com[/:]([^/]+)/([^/]+?)(?:\.git)?/?$", str(url))
    if not match:
        raise ValueError("cannot read owner/name from package.json repository.url; use --repo")
    return f"{match.group(1)}/{match.group(2)}"


def active_rows(changes: Path, repo: str, errors: list[str]) -> tuple[list[str], int]:
    folders = [p for p in (changes / "03-requests").glob("*/") if p.is_dir()]
    folders.sort(key=lambda p: (number_of(p.name), p.name), reverse=True)
    rows = []
    for folder in folders:
        name = folder.name
        spec = spec_file(folder)
        match = NNN.match(name)
        label = match.group(1) if match else name
        cr = f"[{label}]({name}/{spec.name})" if spec else label
        state = folder / "STATE.md"
        header = None
        if not state.is_file():
            errors.append(f"error: {state}: missing STATE.md")
        else:
            try:
                header, bad_line = parse_header(state.read_text(encoding="utf-8"))
            except UnicodeDecodeError:
                header, bad_line = None, 1
            if header is None:
                errors.append(f"error: {state}: unparsable STATE.md header (line {bad_line})")
        if header is None:
            status = f"[{UNPARSABLE}]({name}/STATE.md)" if state.is_file() else UNPARSABLE
            pr = "—"
        else:
            words = f"{header['status']} {header['step']} {header['round']}"
            status = f"[{ICONS[header['status']]} {words}]({name}/STATE.md)"
            pr_match = re.match(r"#(\d+)", header["pr"])
            pr = f"[#{pr_match.group(1)}](https://github.com/{repo}/pull/{pr_match.group(1)})" if pr_match else "—"
        rows.append(f"| {cr} | {cell(subject(spec))} | {status} | `change-requests/{name}` | {pr} |")
    return rows, len(folders)


def drifted(changes: Path) -> dict[Path, Path]:
    """Backlog item folder -> the CR ``backlog-item/`` folder that holds the same item."""
    crs = []
    for parent in ("03-requests", "04-archives"):
        for folder in sorted((changes / parent).glob("*/backlog-item")):
            if folder.is_dir():
                crs.append(folder)
    found: dict[Path, Path] = {}
    for item in sorted(changes.glob("02-backlog/P*/*/")):
        if not item.is_dir():
            continue
        item_md = first_md(item)
        item_title = first_h1(item_md) if item_md else None
        for held in crs:
            held_md = first_md(held)
            held_title = first_h1(held_md) if held_md else None
            if base_name(held.parent.name) == item.name or (item_title and item_title == held_title):
                found[item] = held
                break
    return found


def backlog_rows(changes: Path, skip: set[Path]) -> list[str]:
    rows = []
    items = [p for p in changes.glob("02-backlog/P*/*/") if p.is_dir() and p not in skip]
    for item in sorted(items, key=lambda p: (p.parent.name, p.name)):
        first = first_md(item)
        title = (first_h1(first) if first else None) or "—"
        files = sum(1 for p in item.rglob("*") if p.is_file())
        link = f"[{item.name}](../02-backlog/{item.parent.name}/{item.name}/{first.name})" if first else item.name
        rows.append(f"| {item.parent.name} | {link} | {cell(title)} | {files} |")
    return rows


def landed_rows(changes: Path, repo: str) -> list[str]:
    entries = []
    for folder in (changes / "04-archives").glob("*/"):
        if not (folder.is_dir() and NNN.match(folder.name)):
            continue
        spec = spec_file(folder)
        report = folder / "report.md"
        text = report.read_text(encoding="utf-8") if report.is_file() else ""
        date = DATE.search(text)
        pr = pr_number(text)
        label = NNN.match(folder.name).group(1)
        cr = f"[{label}](../04-archives/{folder.name}/{spec.name})" if spec else label
        report_cell = f"[report](../04-archives/{folder.name}/report.md)" if report.is_file() else "—"
        pr_cell = f"[#{pr}](https://github.com/{repo}/pull/{pr})" if pr else "—"
        row = f"| {cr} | {cell(subject(spec))} | {report_cell} | {pr_cell} | {date.group(0) if date else '—'} |"
        entries.append((date.group(0) if date else "", number_of(folder.name), row))
    entries.sort(key=lambda e: (e[0] != "", e[0], e[1]), reverse=True)
    return [e[2] for e in entries]


def table(head: str, sep: str, rows: list[str]) -> list[str]:
    return [head, sep, *rows] if rows else [head, sep]


def render(changes: Path, repo: str, today: str) -> Result:
    errors: list[str] = []
    warnings: list[str] = []
    name = repo.split("/")[1]
    active, count = active_rows(changes, repo, errors)
    drift = drifted(changes)
    drift_lines = []
    for item, held in sorted(drift.items()):
        item_rel = item.relative_to(changes).as_posix()
        held_rel = held.relative_to(changes).as_posix()
        warnings.append(f"warning: drift: {item_rel} is also {held_rel}")
        drift_lines.append(f"- `{item_rel}` is also `{held_rel}`: listed under its CR only.")
    out = [
        "# CR table",
        "",
        "<!-- Generated by `just orchestrator` (scripts/generate_orchestrator.py). Do not edit: edit",
        "ORCHESTRATOR-NOTES.md or the STATE.md headers, then run `just orchestrator`. -->",
        "",
        "> [!NOTE]",
        f"> Updated {today}: {count} active CR{'' if count == 1 else 's'}.",
        "",
    ]
    if drift_lines:
        out += ["Drift (backlog items already worked by a CR, move or remove them from `02-backlog/`):", "", *drift_lines, ""]
    out += [
        f"Repository: [{repo}](https://github.com/{repo}). Process:",
        "[change-requests-lifecycle.guidelines.md](../../guidelines/change-requests-lifecycle.guidelines.md).",
        f"Worktree of CR NNN: `../{name}-wt-NNN`.",
        "",
        "## Active",
        "",
        *table("| CR (spec) | Subject | Status (STATE.md) | Branch | PR |", "| --- | --- | --- | --- | --- |", active),
        "",
        "## Backlog",
        "",
        *table("| Priority | Item | Title | Files |", "| --- | --- | --- | --- |", backlog_rows(changes, set(drift))),
        "",
        "## Landed",
        "",
        *table(
            "| CR (spec) | Subject | Report | PR | Date |",
            "| --- | --- | --- | --- | --- |",
            landed_rows(changes, repo),
        ),
    ]
    text = "\n".join(out) + "\n"
    notes = changes / "03-requests" / "ORCHESTRATOR-NOTES.md"
    if notes.is_file():
        body = notes.read_text(encoding="utf-8")
        text += "\n" + (body if body.endswith("\n") else body + "\n")
    return Result(text, errors, warnings)


def unchanged(existing: str, new: str) -> bool:
    return ALERT.sub("> Updated -:", existing, count=1) == ALERT.sub("> Updated -:", new, count=1)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("changes", nargs="?", type=Path, default=DEFAULT_CHANGES)
    parser.add_argument("--repo", help="owner/name for links (default: package.json repository.url)")
    parser.add_argument("--output", type=Path, help="default: <changes>/03-requests/ORCHESTRATOR.md")
    parser.add_argument("--today", default=datetime.date.today().isoformat(), help="YYYY-MM-DD, for tests")
    args = parser.parse_args(argv)
    changes: Path = args.changes
    if not (changes / "03-requests").is_dir():
        print(f"error: {changes}: no 03-requests/ folder", file=sys.stderr)
        return 2
    try:
        repo = args.repo or repo_from_package(ROOT)
    except (OSError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    result = render(changes, repo, args.today)
    output = args.output or changes / "03-requests" / "ORCHESTRATOR.md"
    existing = output.read_text(encoding="utf-8") if output.is_file() else None
    if existing is None or not unchanged(existing, result.text):
        output.write_text(result.text, encoding="utf-8")
    for line in (*result.warnings, *result.errors):
        print(line, file=sys.stderr)
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
