# PRD workflow: backlog → change request → PR → archive

How agent sessions turn backlog items into merged pull requests, one CR at a time or several in
parallel ("Parallel Change Requests Orchestration"). Project specifics (gates, commit format,
install restrictions) come from `AGENTS.md`. CI and PR body rules come from
[ci.guidelines.md](ci.guidelines.md).

## Vocabulary

- **Backlog item**: an idea, bug or request not yet scheduled. One folder
  `.agents/changes/backlog/<P1|P2|P3>/<slug>/` holding the intent (`01-intent.md`, plus any
  analysis). P1 = do first, P3 = later. `backlog/INDEX.md` lists them.
- **Change request (CR)**: one unit of delivered work. One CR = one branch = one PR with green CI,
  shipping code, tests (unit + e2e), documentation and screenshots for any visible change.
- **PRD folder**: the working folder of a CR in progress, `.agents/changes/requests/NNN-<slug>/`.
  It is the only source of truth to resume a CR.
- **Archive**: a landed CR, `.agents/changes/archives/NNN-<slug>/` (PRD folder + `report.md`).
- **NNN**: next free three-digit number across `archives/` and `requests/`. Never reuse or skip.

`.agents/changes/` is git-ignored local working memory: never commit it, never link to it.

## Layout

```text
.agents/changes/
├── backlog/INDEX.md              ← priority table of backlog items + closed decisions
├── backlog/P1|P2|P3/<slug>/      ← items not started
├── requests/ORCHESTRATOR.md      ← orchestration brief (parallel mode only)
├── requests/ORCHESTRATOR-STATUS.md ← one line per CR, written by the orchestrator
├── requests/NNN-<slug>/          ← PRD folder
│   ├── 00-request.md             ← intent + user decisions
│   ├── task.md                   ← brief: files, change, tests first, docs, gates
│   ├── rules.md                  ← hard rules for sub-agents (see below)
│   ├── STATE.md                  ← steps 1–11 as a checklist
│   ├── reports/T1-r<n>.md        ← coder report, round n
│   └── reviews/T1-r<n>.md        ← reviewer verdict, round n
└── archives/NNN-<slug>/          ← landed CRs
```

## Roles and models

| Role | Count | Model | Does | Never |
| --- | --- | --- | --- | --- |
| User | 1 | — | answers grill questions, merges PRs | — |
| Main session | 1 | Opus | talks to the user, steps 1–4, starts the orchestrator | edits a worktree a driver owns |
| Orchestrator | 1 | Sonnet | starts drivers, watches merges, step 11, rebase requests | edits worktrees, merges PRs |
| CR driver | 1 per CR | Sonnet | steps 5–10 for its CR, starts coder and reviewer | touches another CR |
| Coder | 1 per round | Sonnet | changes the worktree, runs local gates, writes the report | commits, pushes |
| Reviewer | 1 per round | Sonnet | verifies the diff (read-only), writes the verdict | edits files |

- **Escalation to Opus**: the driver uses Opus for the coder and itself after the second
  FIX-REQUIRED, or after two CI failures with the same cause. The reviewer uses Opus when the CR's
  blast radius is 2 or 3. Use a different model for the reviewer than for the coder when possible.
- **Single CR**: the main session plays orchestrator and driver; coder and reviewer stay separate
  sub-agents.
- **No sub-agents available**: the agent does the missing level itself in separate passes (coding
  pass, then a review pass that rereads the diff from scratch) and says so.

## Lifecycle

| Step | Owner | Action |
| --- | --- | --- |
| 1 Pick | main | In the highest priority with work, propose the easiest item: problem, file:line, fix, PR content. |
| 2 Grill | main | Ask only the questions that change the result, each with a recommended answer. "ok" accepts all. Record answers in `00-request.md`. |
| 3 Open | main | Create the PRD folder, move the backlog content in (partial item: copy the part, note the split in the backlog item), update `INDEX.md`, create the branch from fresh `origin/main`. |
| 4 Brief | main | Write `task.md` and `rules.md`. |
| 5 Code | coder | Implement round n, run local gates, write `reports/T1-r<n>.md`. |
| 6 Review | reviewer | Write `reviews/T1-r<n>.md` starting with `Verdict: APPROVE` or `Verdict: FIX-REQUIRED`. FIX-REQUIRED → step 5, round n+1. No APPROVE after round 3 → blocked, ask the user. |
| 7 Commit | driver | Explicit paths only (never `git add -A` / `git add .`), project commit format. |
| 8 PR | driver | Rebase on `origin/main`, push, open the PR with the template from [ci.guidelines.md](ci.guidelines.md), screenshots in Impacts. |
| 9 CI | driver | `gh pr checks <n> --watch`. Product or test failure → step 5 with the log excerpt. Infra failure (setup, network) → re-run once. Never weaken a test. |
| 10 Notify | driver → user | CI green: report "ready" and what still blocks the merge (for example a review). |
| 11 Land | orchestrator | After the user merges: write `report.md`, move the PRD folder to `archives/`, update `INDEX.md`, remove the worktree. |

Tick `STATE.md` after every step. A new session resumes at the first unticked step.

**Rebase rule**: when any PR merges, rebase every open CR branch on `origin/main` and push with
`--force-with-lease`. This is the only allowed history rewrite. No merge commits.

## Parallel Change Requests Orchestration

Use it when the user asks for several CRs at once. Open PRs never exceed the user's cap
(default 4); further CRs wait locally until a PR merges.

```text
main session ── user interface: grill, decisions, merges
 └─ orchestrator ── one driver per CR, all in parallel; merges, landing, rebase requests
     ├─ CR driver A ── coder r1 → reviewer r1 → coder r2 … (max 3) → commit → PR → CI
     ├─ CR driver B ── same, own worktree
     └─ CR driver C ── same, own worktree
```

### Setup (main session)

1. One worktree per CR, dependencies symlinked, never staged:

   ```bash
   git worktree add -b <type>/<slug> ../<repo>-wt-NNN origin/main --no-track
   ln -s "$PWD/node_modules" ../<repo>-wt-NNN/node_modules
   ```

2. Write `requests/ORCHESTRATOR.md`: one table row per CR (PRD folder, worktree, branch, PR,
   current situation) and the driver prompt (steps 5–10, `rules.md`, absolute paths).
3. Start the orchestrator in the background with that brief.

### Orchestrator loop

1. Start every driver at once, in the background.
2. Every 5 minutes: check merged PRs. On a merge: step 11 for that CR, then message each running
   driver to rebase; restart a returned driver to rebase, push and watch CI.
3. After every event, overwrite `ORCHESTRATOR-STATUS.md`: one line per CR with PR, step, round,
   last CI run and result, next action or question.
4. Return when every CR is "ready" or "blocked", with each question and a recommended answer.

### Constraints

- One driver per worktree; PRD folders stay in the main checkout (absolute paths).
- Two CRs never run app-window tests locally at the same time; CI runs the full gate.
- No agent starts a new backlog item or merges a PR: the user decides.
- Any level can be stopped and restarted: it resumes from `STATE.md`, the latest report and
  review, and `ORCHESTRATOR-STATUS.md`.

## Sub-agent rules (copy into `rules.md`)

- Work on the CR branch only. Never commit, push, stash or switch branches (driver's job).
- No installs, no network unless `AGENTS.md` allows it.
- Run only the gates `task.md` lists, in the foreground; leave nothing running.
- Touch only the files the task needs. Never change an existing assertion's intent. New tests must
  fail on the unchanged code.
- Report: files changed, tests added and their failure before the change, changed assertions and
  why, gate results with counts, screenshot paths, open points.

## Screenshots in the PR

Take them from the e2e/visual run of the final code, light and dark when themes matter. Push them
as raw blobs to a side branch (bypasses Git LFS) and link the raw URLs:

```bash
tree=$(for f in shots/*.png; do
  printf '100644 blob %s\t%s\n' "$(git hash-object -w --no-filters "$f")" "$(basename "$f")"
done | git mktree)
commit=$(git commit-tree "$tree" -m "PR #<n> screenshots")
git push origin "${commit}:refs/heads/pr-assets/<n>"  # braces: zsh reads $commit:r as a modifier
# URL: https://raw.githubusercontent.com/<owner>/<repo>/${commit}/<name>.png
```

Keep `pr-assets/<n>` after merge: the PR body points at it.

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
