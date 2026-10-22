# PRD workflow: backlog → change request → PR → archive

How an agent session turns backlog items into merged pull requests. Read this before picking up
any work from `.agents/changes/`. Project specifics (gate commands, commit format, install
restrictions) come from `AGENTS.md`; this file only defines the workflow.

## Vocabulary

- **Backlog item**: an idea, bug or request not yet scheduled. One folder
  `.agents/changes/backlog/<P1|P2|P3>/<slug>/` holding the intent (`00-request.md` or
  `01-intent.md`, plus any analysis). P1 = do first, P3 = later. `backlog/INDEX.md` lists them.
- **Change request (CR)**: one unit of delivered work. One CR = one branch = one PR whose CI is
  green. It ships code, tests (unit + e2e), documentation and screenshots for any visible change.
- **PRD folder**: the working folder of a CR while it is in progress,
  `.agents/changes/requests/NNN-<slug>/`. It is the single source of truth to resume the CR in a
  new session (see Layout).
- **Archive**: a landed CR, `.agents/changes/archives/NNN-<slug>/`: the PRD folder moved there
  after merge, with its `report.md`.
- **NNN**: a three-digit number in landing order across `archives/` and `requests/`. Take the next
  free number; never reuse or skip one.

`.agents/changes/` is usually git-ignored: it is local working memory, never committed.

## Layout

```text
.agents/changes/
├── backlog/INDEX.md            ← priority table of backlog items + closed decisions
├── backlog/P1|P2|P3/<slug>/    ← intents not started
├── requests/NNN-<slug>/        ← CR in progress (PRD folder)
│   ├── 00-request.md           ← intent (copied/split from the backlog) + user decisions
│   ├── STATE.md                ← checklist of the steps below, ticked as they complete
│   ├── task.md                 ← implementation brief (files, change, tests, docs, gates)
│   ├── rules.md                ← hard rules for the sub-agents
│   ├── reports/T1-r1.md        ← implementer report per round
│   └── reviews/T1-r1.md        ← reviewer verdict per round
└── archives/NNN-<slug>/        ← landed CRs (same content + report.md)
```

## Lifecycle

1. **Pick.** Within the highest priority that has work, propose the easiest item first (inverse
   difficulty). Say what is wrong, where (file:line), the planned fix and what the PR will contain.
2. **Grill.** Ask the user the few questions that change the result, each with a recommended
   option. A bare "ok" accepts the recommendations. Record the answers in `00-request.md`.
3. **Open the CR.** Create `requests/NNN-<slug>/` and move the backlog folder content into it. If
   the CR covers only part of an item, copy that part, remove it from the backlog item and note the
   split there. Update `backlog/INDEX.md`. Create the branch from the fresh default branch
   (`git fetch && git switch -c <type>/<slug> origin/main --no-track`).
4. **Brief.** Write `task.md` (what to change, tests to write first, docs, gates) and `rules.md`.
5. **Implement.** Spawn an implementer sub-agent (Sonnet) on `task.md` + `rules.md`. It changes the
   working tree, runs the local gates and writes `reports/T1-r<round>.md`. It never commits.
6. **Review.** Spawn a separate reviewer sub-agent (Sonnet), read-only, which verifies instead of
   trusting the report and writes `reviews/T1-r<round>.md` starting with `Verdict: APPROVE` or
   `Verdict: FIX-REQUIRED`. On FIX-REQUIRED, send the findings to the implementer (round + 1).
   After three rounds without approval, stop and ask the user.
7. **Commit.** The orchestrator commits: explicit paths only (never `git add -A` / `git add .`),
   Conventional Commits, the project's trailer rules.
8. **PR.** Push the branch and open the PR. Body: summary, what changed, screenshots (see below),
   test plan with the local gate results, link to nothing in `.agents/changes/` (it is local).
9. **CI.** Watch the checks (`gh pr checks <n> --watch`). Fix failures with new commits and a plain
   push: never force-push or rewrite pushed history. Never weaken a test to get green; fix the
   product or explain why the test was wrong.
10. **Notify.** When CI is green, tell the user the PR is ready and what still blocks the merge
    (for example a required review).
11. **Land (after merge).** Write `report.md`, move `requests/NNN-<slug>` to
    `archives/NNN-<slug>`, and update `backlog/INDEX.md`.

Tick each step in the CR's `STATE.md` as it completes, so a new session resumes at the first
unticked step.

## Parallel CRs

Run two CRs at once with one git worktree per extra CR, next to the main checkout:

```bash
git worktree add -b <type>/<slug> ../<repo>-wt-NNN origin/main --no-track
ln -s "$PWD/node_modules" ../<repo>-wt-NNN/node_modules   # reuse deps, no install
```

Each sub-agent works only in its worktree; PRD folders stay in the main checkout's
`.agents/changes/` (absolute paths in the brief). Never stage the dependency symlinks. Two
CRs must not run app-window tests at the same time. Remove the worktree after landing
(`git worktree remove ../<repo>-wt-NNN`).

## Sub-agent rules (put in `rules.md`)

- Work on the CR branch. Never commit, push, stash or switch branches.
- Never install or use the network unless `AGENTS.md` allows it.
- Run only the gates the orchestrator allows locally. Run them in the foreground and leave nothing
  running. If the user is working in the same app (for example VS Code), do not launch tests that
  open its windows: CI runs the full gate.
- Touch only the files the task needs. Never change an existing assertion's intent. New tests must
  fail on the unchanged code.
- Report: files changed, tests added and their failure before the change, changed assertions and
  why, gate results with counts, screenshot paths, open points.

## Screenshots in the PR

Take them from the e2e/visual run of the final code, light and dark when themes matter. GitHub
renders images in a PR body only from a URL. Push them as raw blobs to a side branch, bypassing
Git LFS filters:

```bash
tree=$(for f in shots/*.png; do
  printf '100644 blob %s\t%s\n' "$(git hash-object -w --no-filters "$f")" "$(basename "$f")"
done | git mktree)
commit=$(git commit-tree "$tree" -m "PR #<n> screenshots")
git push origin "${commit}:refs/heads/pr-assets/<n>"  # braces: zsh reads $commit:r as a modifier
# URL: https://raw.githubusercontent.com/<owner>/<repo>/${commit}/<name>.png
```

Keep `pr-assets/<n>` after merge: the merged PR body still points at it.

## `report.md` (archive)

```markdown
# Report — <slug>

Status: **done** | **partial** (date, branch, PR #<n>, merge commit).

## Delivered

| Task | Change | Commit |
| --- | --- | --- |

## Proof of completion

- Tests added (failed before, pass after), local gate counts, CI run id, screenshots.

## Open items

- Anything left, with the backlog folder it went to. "None." otherwise.
```
