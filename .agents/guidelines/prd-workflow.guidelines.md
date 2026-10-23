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
├── requests/ORCHESTRATOR.md      ← CR table only (parallel mode)
├── requests/ORCHESTRATOR-STATUS.md ← rebuilt by the orchestrator from the STATE.md headers
├── requests/NNN-<slug>/          ← PRD folder
│   ├── 00-request.md             ← intent + user decisions
│   ├── task.md                   ← brief: files, change, tests first, docs, gates
│   ├── rules.md                  ← hard rules for sub-agents (see below)
│   ├── STATE.md                  ← header (see below) + steps 1–11 as a checklist
│   ├── reports/T1-r<n>.md        ← coder report, round n
│   └── reviews/T1-r<n>.md        ← reviewer verdict, round n
└── archives/NNN-<slug>/          ← landed CRs
```

## Roles and models

| Role | Count | Model | Does | Never |
| --- | --- | --- | --- | --- |
| User | 1 | — | answers grill questions, grants extra rounds, merges PRs | — |
| Main session | 1 | Opus | talks to the user, steps 1–4, starts and supervises the orchestrator | starts drivers, lands CRs, edits a CR worktree |
| Orchestrator | 1 | Sonnet | starts and supervises drivers, watches merges, step 11, rebase requests | runs long commands, codes, reviews, commits, merges PRs |
| CR driver | 1 per CR | Sonnet | steps 5–10 for its CR, starts coder and reviewer, watches its CI | codes, reviews, touches another CR |
| Coder | 1 per round | Sonnet | changes the worktree, runs local gates, writes the report | commits, pushes, lives past its round |
| Reviewer | 1 per round | Sonnet | verifies the diff (read-only), writes the verdict | edits files, lives past its round |

- **Escalation to Opus**: the driver uses Opus for the coder after the second FIX-REQUIRED, or
  after two CI failures with the same cause. The reviewer uses Opus when the CR's blast radius is
  2 or 3. Orchestrator and drivers stay on Sonnet (a session limit on one model must not stop the
  whole tree).
- **Never move a task up a level**: each role does only its own row, even for a single CR and even
  when a child fails. A failing child is restarted (see "Supervision"), never replaced by its
  parent. If sub-agents cannot be started at all, the agent returns "blocked" to its parent.

## Lifecycle

| Step | Owner | Action |
| --- | --- | --- |
| 1 Pick | main | In the highest priority with work, propose the easiest item: problem, file:line, fix, PR content. |
| 2 Grill | main | Ask only the questions that change the result, each with a recommended answer. "ok" accepts all. Record answers in `00-request.md`. |
| 3 Open | main | Create the PRD folder, move the backlog content in (partial item: copy the part, note the split in the backlog item), update `INDEX.md`, create the worktree and branch from fresh `origin/main`. |
| 4 Brief | main | Write `task.md`, `rules.md`, the `STATE.md` header, and the row in `ORCHESTRATOR.md`. |
| 5 Code | coder | Implement round n, run local gates, write `reports/T1-r<n>.md`. |
| 6 Review | reviewer | Write `reviews/T1-r<n>.md` starting with `Verdict: APPROVE` or `Verdict: FIX-REQUIRED`. FIX-REQUIRED → step 5, round n+1. |
| 7 Commit | driver | Explicit paths only (never `git add -A` / `git add .`), project commit format. |
| 8 PR | driver | Rebase on `origin/main`, push, open the PR with the template from [ci.guidelines.md](ci.guidelines.md), screenshots in Impacts. |
| 9 CI | driver | Watch the checks (see "Responsiveness"). Product or test failure → step 5 with the log excerpt. Infra failure (setup, network) → re-run once. Never weaken a test. |
| 10 Notify | driver | CI green: `status: ready` in the header, then return. |
| 11 Land | orchestrator | After the user merges: write `report.md`, move the PRD folder to `archives/`, update `INDEX.md`, remove the worktree and branch. |

**Round limit**: a round is one coder pass, whether a review or a CI failure triggered it. At most
3 rounds per CR, all causes together. After round 3 without green CI, the driver sets
`status: blocked` with its diagnosis and a question, and returns. Only the user grants more rounds
(written in `00-request.md`, for example "rounds: 5").

**Rebase rule**: when any PR merges, rebase every open CR branch on `origin/main` and push with
`--force-with-lease`. This is the only allowed history rewrite. No merge commits.

### `STATE.md` header

The first four lines of `STATE.md`, rewritten by the owner of the current step at every
transition and at every CI watch slice. Everything else reads it; nobody keeps a CR's state in
memory only.

```text
driver: <agent id | none> · updated: <HH:MM>
status: <working | wait-ci | ready | blocked | landed> · step: <1–11 name> · round: <n>/<limit>
head: <sha> · PR: <#n | —> · run: <id> <pass | fail | pending>
next: <next action> · question: <question for the user, or —>
```

`driver:` is a lock: a CR has at most one live driver. A new orchestrator reads it before starting
a driver and messages the existing one instead of starting a second.

## Parallel Change Requests Orchestration

Use it when the user asks for several CRs at once. Open PRs never exceed the user's cap
(default 4); further CRs wait locally until a PR merges.

```text
main session ── user interface: grill, decisions, merges; supervises the orchestrator
 └─ orchestrator ── one driver per CR, in parallel; ticks every 4–5 min; merges, landing
     ├─ CR driver A ── coder r1 → reviewer r1 → coder r2 … (max 3) → commit → PR → CI watch
     ├─ CR driver B ── same, own worktree
     └─ CR driver C ── same, own worktree
```

### Setup (main session)

1. One worktree per CR, dependencies symlinked, never staged:

   ```bash
   git worktree add -b <type>/<slug> ../<repo>-wt-NNN origin/main --no-track
   ln -s "$PWD/node_modules" ../<repo>-wt-NNN/node_modules
   ```

2. `requests/ORCHESTRATOR.md` holds only the CR table: CR, PRD folder, worktree, branch, PR. The
   situation of each CR lives in its `STATE.md` header, the driver prompt in this guideline.
3. Start the orchestrator in the background (Sonnet), pointing it to this guideline and the table.

### Responsiveness

No agent blocks: a message from its parent is read within 5 minutes.

- **Orchestrator**: no command longer than a few seconds (no watch, no test, no rebase). It wakes
  on a driver's return, on a message, or on its tick: a 270-second `sleep` run in the background,
  restarted at the end of every tick.
- **Driver**: watches its own CI, in slices of at most 5 minutes (`gh pr checks <n>`, then a
  background `sleep`, or `gh pr checks <n> --watch` run in the background), reads its messages
  between slices, and rewrites the `STATE.md` header at every slice.
- **Coder and reviewer**: one round, then return. Their gates run in the foreground but never
  outlive the round.

### Orchestrator tick

1. First tick, within 5 minutes of starting: for each CR in the table, read the header; start a
   driver (background) where `driver: none` and the status is not ready, blocked or landed.
2. Every tick: check merged PRs. On a merge: step 11 for that CR, then message each live driver to
   rebase; for a ready CR without a live driver, start one for "rebase, push, watch CI".
3. Check every driver against the supervision rules and the round limit.
4. Rebuild `ORCHESTRATOR-STATUS.md` from the headers: one line per CR, plus the time of the tick.
5. Return when every CR is ready, blocked or landed, with each question and a recommended answer.

### Supervision

- Parents supervise only their own children: the main session supervises the orchestrator; the
  orchestrator its drivers; a driver its coder and reviewer.
- **Stuck**: the child's header (`ORCHESTRATOR-STATUS.md` for the orchestrator) is more than 15
  minutes old. The parent messages it; if the next tick shows no change, the parent stops it and
  starts the same role with the same brief, which resumes from the files.
- **Crashed** (for example a session limit, HTTP 429): the parent resumes the same agent by message
  after the reset time instead of starting a new one, so it keeps its history.
- **Round limit exceeded** without `status: blocked`: the orchestrator stops the driver, sets the
  CR to blocked and reports the question upward.
- After two restarts of the same child without progress, the parent reports "blocked" upward.

### Driver prompt (the orchestrator fills the placeholders)

> You are the CR driver for CR `<NNN>`. You alone own worktree `<path>` (branch `<branch>`, PR
> `<#n or none>`). Read `.agents/guidelines/prd-workflow.guidelines.md` (lifecycle, round limit,
> `STATE.md` header, responsiveness), `.agents/guidelines/ci.guidelines.md`, and the PRD folder
> `<absolute path>` (`00-request.md`, `task.md`, `rules.md`, `STATE.md`, latest report and review).
> Resume from the `STATE.md` header and write `driver: <your id>` in it. Run steps 5–10: start a
> coder, then a separate reviewer, per round, in the background; commit, rebase, push, PR; watch
> CI in slices of at most 5 minutes. Rewrite the header at every transition and every slice. Never
> code or review yourself. Return with `status: ready` or `status: blocked` and a question with
> your recommended answer.

### Stacked PRs (several CRs in flight)

When several CRs run at the same time (for example a night run), the orchestrator proposes to the
main session, which asks the user, to link their PRs as one GitHub stack instead of rebasing every
PR on `main` after each merge.

How a stack works (details:
[about stacked PRs](https://docs.github.com/en/pull-requests/get-started/about-stacked-prs),
[CLI reference](https://docs.github.com/en/pull-requests/reference/stacked-prs-cli-commands)):

- The bottom PR targets `main`; each PR above targets the branch of the PR below it. Each PR shows
  only its own diff and runs the same CI.
- Merges go bottom-up. Merging a PR merges every PR below it; after a merge, GitHub retargets the
  remaining PRs and rebases them automatically.
- `main`'s rules (required checks, reviews, linear history) apply to every PR of the stack and
  cannot be bypassed. A stacked PR is merged with `gh stack merge` (or the web UI), not
  `gh pr merge`.
- Commands (extension `gh extension install github/gh-stack`, gh 2.90+):
  `gh stack link --base main <PR bottom> … <PR top>` links existing PRs, `gh stack rebase` and
  `gh stack push` restack after a change, `gh stack merge <PR> --rebase` merges up to that PR.

Proposing a smart order (bottom to top):

1. A PR that another one depends on sits below it.
2. Small, low-risk, independent fixes at the bottom, so they can merge first and alone.
3. PRs touching the same files stay adjacent, to resolve each conflict once.
4. Large features above the fixes; test-harness and e2e PRs at the top.
5. A PR that is red or likely to need rework goes to the top, so it never blocks the others.

One "stack driver" owns all the stacked branches (it restacks and pushes); the CR drivers stop
pushing once their PR is in the stack. Changing a lower PR means restacking everything above it.

### Constraints

- One driver per worktree; PRD folders stay in the main checkout (absolute paths).
- Two CRs never run app-window tests locally at the same time; CI runs the full gate.
- No agent starts a new backlog item or merges a PR: the user decides.
- Shell commands never wait for input: `rm`, `cp` and `mv` may be aliased to `-i`, so call them
  as `\rm`, `\cp`, `\mv` to bypass the alias.

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
