#!/usr/bin/env python3
"""New-feature coverage skeleton for the Scope step of a campaign.

Lists the pull requests merged since the previous campaign and prints the markdown table that goes
into 00-index.md: PR, feature (the PR title), charter (TODO), result (blank). Obviously
non-user-facing PRs (chore/ci/build/test/docs/... titles or labels) are listed apart; confirm them.

The previous campaign's date comes from `--since DATE`, else from `--campaign DIR` (its 00-index.md
`Date:` line, else the commit date of its recorded revision), else from the newest archived QA
campaign under $QA_CHANGES_ROOT (default <repo>/.agents/changes), the same lookup as
coverage-map.py. The search is `merged:>=DATE` (a PR merged on the campaign day after the recorded
revision still counts). PRs already in the recorded revision are dropped: merge commit an ancestor,
or a log subject exactly "<title> (#N)", or (only when the revision is an ancestor of the default
branch) merged at/before the revision's commit time (rebase/squash merges).

Rows of the previous campaign's new-feature table that were never covered (Charter `TODO`, or a
Result that says "not run") are carried forward under the table: a PR merged before the baseline
stays visible until a campaign covers it.

Usage:
  python3 new-features.py [--since YYYY-MM-DD] [--campaign DIR] [--repo OWNER/NAME]
                          [--json-file FILE] [--dry-run]
  --json-file FILE  read saved `gh pr list --json ...` output instead of calling gh (offline test)
  --dry-run         print the gh command that would run, call nothing
Requires: gh (authenticated) unless --json-file is given.
"""
import argparse
import datetime
import importlib.util
import json
import re
import shlex
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("coverage_map", HERE / "coverage-map.py")
cm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cm)

NON_USER_TITLE = re.compile(r"^(chore|ci|build|test|tests|docs|doc|refactor|style|perf-test|deps)(\(.+?\))?!?[:\s]", re.I)
NON_USER_LABELS = {"chore", "ci", "build", "test", "tests", "docs", "documentation", "dependencies", "internal"}
FIELDS = "number,title,mergedAt,labels,mergeCommit,url"


def baseline(args):
    """Return (date, revision, note)."""
    if args.since:
        return args.since, None, "--since"
    campaign, how = cm.resolve_campaign(args.campaign)
    if not campaign:
        return None, None, how
    rev, note = cm.last_campaign_rev(campaign)
    # Search from the earlier of the revision's commit date and the index Date, one day earlier for
    # the UTC/local offset of GitHub's `merged:` qualifier. The ancestry filter drops what the
    # revision already contains, so an early date only costs a few extra rows to filter.
    dates = []
    for index in cm.campaign_indexes(campaign):
        d = cm.index_date(index)
        if d:
            dates.append(d)
            break
    if rev:
        d = cm.git("show", "-s", "--format=%cs", rev)
        if d:
            dates.append(d)
    date = None
    if dates:
        date = (datetime.date.fromisoformat(min(dates)) - datetime.timedelta(days=1)).isoformat()
    return date, rev, f"{campaign} ({how})" + (f"; {note}" if note else "")


def on_default_branch(rev):
    """True when rev is an ancestor of the default branch (origin/HEAD, origin/main, origin/master)."""
    sym = subprocess.run(["git", "-C", str(cm.REPO), "symbolic-ref", "--short", "refs/remotes/origin/HEAD"],
                         capture_output=True, text=True)
    names = ([sym.stdout.strip()] if sym.returncode == 0 and sym.stdout.strip() else []) \
        + ["origin/main", "origin/master"]
    for name in names:
        if subprocess.run(["git", "-C", str(cm.REPO), "rev-parse", "--verify", "-q", name],
                          capture_output=True).returncode:
            continue
        return subprocess.run(["git", "-C", str(cm.REPO), "merge-base", "--is-ancestor", rev, name],
                              capture_output=True).returncode == 0
    return False


def non_user_facing(pr):
    labels = {(l.get("name") if isinstance(l, dict) else str(l)).lower() for l in pr.get("labels") or []}
    return bool(NON_USER_TITLE.match(pr["title"])) or bool(labels & NON_USER_LABELS)


def cell(text):
    return text.replace("|", "\\|").strip()


def split_row(line):
    """Cells of a markdown table row; an escaped pipe stays inside its cell."""
    cells = re.split(r"(?<!\\)\|", line.strip().strip("|"))
    return [c.strip() for c in cells]


def carried_rows(campaign):
    """Rows of the previous index's new-feature table left at TODO or "not run": [(cells, index)]."""
    rows = []
    for index in cm.campaign_indexes(campaign):
        lines = Path(index).read_text(encoding="utf-8").splitlines()
        for i, line in enumerate(lines):
            head = [c.lower() for c in split_row(line)] if line.lstrip().startswith("|") else []
            if head[:4] != ["pr", "feature", "charter", "result"]:
                continue
            for row in lines[i + 2:]:
                if not row.lstrip().startswith("|"):
                    break
                cells = split_row(row)
                if len(cells) < 4:
                    continue
                charter, result = cells[2], cells[3]
                if charter.upper() == "TODO" or re.search(r"\bnot run\b", result, re.I):
                    rows.append((cells[:4], index))
    return rows


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--since", help="previous campaign date, YYYY-MM-DD")
    ap.add_argument("--campaign", help="previous campaign folder (holds 00-index.md)")
    ap.add_argument("--repo", help="OWNER/NAME, passed to gh --repo")
    ap.add_argument("--json-file", help="saved gh JSON instead of calling gh")
    ap.add_argument("--dry-run", action="store_true", help="print the gh command, call nothing")
    args = ap.parse_args()

    date, rev, note = baseline(args)
    previous, _how = cm.resolve_campaign(args.campaign)
    carried = carried_rows(previous) if previous else []
    if not date:
        sys.exit(f"No previous campaign date: {note}. Pass --since DATE or --campaign DIR.")
    cmd = ["gh", "pr", "list", "--state", "merged", "--search", f"merged:>={date}",
           "--json", FIELDS, "--limit", "200"] + (["--repo", args.repo] if args.repo else [])
    print(f"<!-- baseline: {date}" + (f", revision {rev}" if rev else "") + f", source: {note} -->")
    if args.dry_run and not args.json_file:
        print("<!-- dry run, would run: " + shlex.join(cmd) + " -->")
        return
    if args.json_file:
        prs = json.loads(Path(args.json_file).read_text(encoding="utf-8"))
    else:
        done = subprocess.run(cmd, capture_output=True, text=True, cwd=cm.REPO)
        if done.returncode:
            sys.exit(f"gh failed: {done.stderr.strip() or done.stdout.strip()}\nCommand: {shlex.join(cmd)}")
        prs = json.loads(done.stdout or "[]")

    if len(prs) >= 200:
        print("<!-- WARNING: gh returned 200 PRs (the --limit); older merges may be missing. "
              "Narrow with --since. -->")
    kept, dropped = [], []
    rev_time = None
    rev_subjects = set()
    if rev:
        stamp = cm.git("show", "-s", "--format=%cI", rev)
        if stamp:
            try:
                rev_time = datetime.datetime.fromisoformat(stamp.strip())
            except ValueError:
                pass
        log = subprocess.run(["git", "-C", str(cm.REPO), "log", "--format=%s", rev],
                             capture_output=True, text=True)
        rev_subjects = set(log.stdout.splitlines()) if log.returncode == 0 else set()
        # Commit time is a valid cut-off only for a commit of the default branch; a branch or rebased
        # revision is committed later than PRs it does not contain.
        if rev_time and not on_default_branch(rev):
            print(f"<!-- revision {rev[:8]} is not on the default branch: "
                  "the merged-before-revision rule is off -->")
            rev_time = None
    for pr in prs:
        oid = (pr.get("mergeCommit") or {}).get("oid")
        why = None
        if rev:
            # (1) the merge commit itself is in the revision (merge commits)
            if oid and cm.known_ancestor(oid) and subprocess.run(
                    ["git", "-C", str(cm.REPO), "merge-base", "--is-ancestor", oid, rev],
                    capture_output=True).returncode == 0:
                why = "merge commit is an ancestor"
            # (2) merged at or before the revision's commit time (rebase/squash merges)
            elif rev_time and pr.get("mergedAt") and datetime.datetime.fromisoformat(
                    pr["mergedAt"].replace("Z", "+00:00")) <= rev_time:
                why = "merged before the revision was committed"
            # (3) a commit subject "<title> (#N)" (squash merge) is in the log
            elif f"{pr['title']} (#{pr['number']})" in rev_subjects:
                why = "a commit titled like the PR (#N) is in the revision"
        if why:
            dropped.append((pr, why))
        else:
            kept.append(pr)
    if dropped:
        print(f"<!-- already in {rev[:8]}: "
              + "; ".join(f"#{p['number']} ({w})" for p, w in dropped) + " -->")
    kept.sort(key=lambda p: p.get("mergedAt") or "")
    user = [p for p in kept if not non_user_facing(p)]
    other = [p for p in kept if non_user_facing(p)]

    print(f"\n### New-feature coverage ({len(user)} PR(s) merged since {date})\n")
    print("| PR | Feature | Charter | Result |\n| --- | --- | --- | --- |")
    for pr in user:
        link = f"[#{pr['number']}]({pr['url']})" if pr.get("url") else f"#{pr['number']}"
        print(f"| {link} | {cell(pr['title'])} | TODO | |")
    if not user:
        print("| (none) | | | |")
    shown = {f"#{p['number']}" for p in user}
    carried = [(c, i) for c, i in carried if not any(n in shown for n in re.findall(r"#\d+", c[0]))]
    if carried:
        print(f"\nCarried forward from {previous} ({len(carried)}; not covered there, add them to the table):\n")
        print("| PR | Feature | Charter | Result |\n| --- | --- | --- | --- |")
        for cells, _index in carried:
            print(f"| {cells[0]} | {cells[1]} | TODO | previous: {cells[2]}, {cells[3]} |")
    print("\nCharter: charter ID, or `automated: <test>`. Result: PASS / finding IDs / not run.")
    print("A user-facing PR left at TODO is a gap: list it under Limits; status cannot be `completed`.")
    if other:
        print(f"\nProbably not user-facing ({len(other)}; confirm, then ignore or move up):\n")
        for pr in other:
            print(f"- #{pr['number']} {pr['title']}")


if __name__ == "__main__":
    main()
