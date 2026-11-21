# Change Requests Life Cycle: inbox → backlog → change request → PR → archive

This is the process guideline: how agent sessions turn backlog items into merged pull requests, one
CR at a time or several in parallel ("Parallel Change Requests Orchestration"). The change requests
live in the planning folder, and [chantier](https://github.com/gsemet/chantier) runs their stages,
files, status and batches: its cards (`chantier rules`, the role cards) describe them, and this
guideline no longer repeats them. It keeps what is specific to this project. It ranks below the
constitution, `AGENTS.md` and every project guideline: on a conflict the project guideline wins and
the conflict is reported; where they are silent, this guideline holds. Project specifics (gates,
commit format, install restrictions) come from `AGENTS.md`. The rules a pull request must respect
come from the project guidelines: [ci.guidelines.md](ci.guidelines.md),
[pull-request.guidelines.md](pull-request.guidelines.md),
[stacked-prs.guidelines.md](stacked-prs.guidelines.md),
[local-worktree.guidelines.md](local-worktree.guidelines.md),
[owner-review.guidelines.md](owner-review.guidelines.md) and
[release-process.guidelines.md](release-process.guidelines.md).

## Project bindings

The rest of this guideline is written for any project. It names each project-specific step by a
hook; this table binds each hook to this project. Another project reuses the guideline by
replacing this table.

| Hook | In this project |
| --- | --- |
| Requirements check | [requirements/guidelines/project.guidelines.md](../../requirements/guidelines/project.guidelines.md): "Approved requirements" at the grill, "During a change" (the SwRS, the markers, `just requirements-update`, the log entry) while coding, and its check before the PR |
| Status table | chantier's board (`chantier board`), see "Status table" |
| Visual evidence | the headless visual run of the local gates for the editor and the preview; otherwise the e2e group that covers the change |
| PR template | `.github/PULL_REQUEST_TEMPLATE.md`, filled as in [pull-request.guidelines.md](pull-request.guidelines.md) |
| Keep awake | `caffeinate`, as in [local-worktree.guidelines.md](local-worktree.guidelines.md) |

## Where the change requests live

The planning folder is the one `AGENTS.md` names on its `planning:` line (section "chantier"):
`projects/markdown-okf-schema-studio/changes/` of the planning surface. No change request lives in
this repository, and a pull request body never links to the planning folder (see
[pull-request.guidelines.md](pull-request.guidelines.md)).

chantier 0.11 owns the layout, so this guideline only names it:

- Stages, by folder: `1-inbox`, `2-backlog/P1`..`P4` (P1 = do first, P4 = someday), `3-ready`,
  `4-batch/1-pending`, `4-batch/2-actives`, `4-batch/3-done`, `5-archives`, `6-trash`. Moving a
  change request is changing its stage or priority. Only the user abandons an item (`6-trash`);
  agents never start work from the trash.
- A change request folder holds `intake/`, `01-intent.md`, `02-answers.md`, `03-change-spec.md`,
  `summary.json` (title, summary and origin, written by `chantier summary set`, never by hand),
  `evidence/` and `work/` (rules, tasks, rounds, reports, reviews, pull request bodies). An archive
  adds `delivery.md`. `just validate` in the planning surface checks it.
- The tracker issue an item comes from is the origin in its `summary.json`; an item with no issue
  skips the issue steps with one line in its notes.
- One change request is one branch, one pull request with green CI, shipping code, tests (unit and
  e2e), documentation and screenshots for any visible change.

The old lifecycle of this guideline (the `3-requests/` PRD folders, `task.md`, `rules.md`, the
`STATUS.md` header, `brief.md`, the Foreman heartbeat, the driver and stack driver prompts, the
`report.md` and `retro.md` formats) is replaced by chantier's: read its cards instead.

## Roles and models

Unless specified by user through your context otherwise, here are the default roles and models to use

| Role | Count | Model (Claude Code) | Alternative (GitHub Copilot coding agent) | Never |
| --- | --- | --- | --- | --- |
| User | 1 | — | —  | — |
| Chief of Staff | 1 | Opus 5.5 | Opus 5.5 (copilot) | starts drivers, lands CRs, edits a CR worktree |
| Foreman | 1, in a nested session | Sonnet 5.5 | Sonnet 5.5 (copilot) | runs long commands, codes, reviews, commits, merges PRs |
| Release driver | 1 per release | Sonnet | Sonnet 5.5 (copilot) | codes, reviews, asks the owner between the notes review and the publication (except a real blocker) |
| CR driver | 1 per CR | Sonnet | Sonnet 5.5 (copilot)  | codes, reviews, touches another CR |
| Stack driver | 1 per stack | as the CR driver | as the CR driver | merges, enables auto-merge |
| Conflict resolver | as needed | — | — | pushes |
| Coder | 1 per round | Sonnet | GPT 5.6 Luna (copilot) | commits, pushes, lives past its round |
| Inspector | 1 per round | Sonnet | GPT 6.1 Sol (copilot) | edits files, lives past its round |
| Verifier | 1 per run of the verify step | Sonnet | GPT 6.1 Sol (copilot) | is the round's coder or Inspector, edits code, lives past its run |

Chantier's own role cards name its roles (Driver, Coder, Reviewer and so on); where they differ
from this table, chantier's cards win for what a role does, and this table still sets the models.

- **Escalation to Opus**: the driver uses Opus for the coder after the second FIX-REQUIRED, or
  after two CI failures with the same cause. The Inspector uses Opus when the CR's blast radius is
  2 or 3. The Foreman and the drivers stay on Sonnet (a session limit on one model must not stop
  the whole tree).
- **Never move a task up a level**: each role does only its own row, even for a single CR and even
  when a child fails. A failing child is restarted, never replaced by its parent. If sub-agents
  cannot be started at all, the agent returns "blocked" to its parent.
- **Verifier**: a fresh agent, never the round's coder or Inspector, so it does not grade its own
  work. It reads the project; it never edits code. It may create one detached worktree
  (`git worktree add --detach <path> <base>`) and must remove it before it returns. The base of a
  CR is `origin/main`, or in stack mode the branch below it in the stack (its PR's base). It stays
  on Sonnet for every blast radius.

## Project rules on top of chantier's steps

These hold whoever runs the steps:

- **Grill and spec**: the requirements check of "Project bindings" is part of the grill: list the
  approved requirements the item would change and record the owner's answer in `02-answers.md`.
  The documents the owner reads follow [owner-review.guidelines.md](owner-review.guidelines.md).
- **Code**: for a `feat` or `fix` change, write the `## Unreleased` line of `CHANGELOG.md` in the
  same round. A change that alters the size or a value other code measures from (a fixed bar, a
  reserved margin, a limit) lists every value derived from it, found by searching for the old value
  and for what is computed from it, and the coder updates or confirms each one.
- **Commit**: explicit paths only (never `git add -A` / `git add .`), project commit format.
- **Pull request**: rebase on `origin/main`, push, open it as a draft with the template of
  [ci.guidelines.md](ci.guidelines.md), written as in
  [pull-request.guidelines.md](pull-request.guidelines.md); with a tracker issue, its body names
  the issue with the tracker's closing keyword. Before opening it, run the requirements check; a gap
  is a new round. The Changelog checkbox is ticked, or says "No user-facing change".
- **Early heavy CI**: a change request that adds or changes visual, integration or stress scenarios
  gets the heavy CI after round 1, not at the end. On Windows, `just preflight` runs only the static
  stage, so visual and real VS Code window failures show up only in CI. The rule applies when the
  round 1 diff touches `test/visual/`, `test/integration/` or the stress list
  `test/shared/stressPlan.ts`, or when `03-change-spec.md` asks for such scenarios. Other change
  requests keep the current steps.
  - **Early push**: after round 1, whatever the round's review verdict, the change request's own
    Driver does these steps in order:
    - Make a checkpoint commit of round 1's state: explicit paths, project commit format.
    - Rebase on the base, then run the project's fast gate (`just check`) at the rebased head.
    - Push the branch without the long gate (`just preflight`).
    - Open the pull request as a draft with a provisional body: the template's sections, with what
      is not known yet marked as provisional.
    - In its own command, run `gh workflow run ci.yml --ref <branch> -f heavy=true`.
  - The requirements check stays before the pull request leaves draft, as the **Pull request**
    bullet says. `just preflight` stays a long gate before ready. This overrides the chantier
    Driver card's "gate before the first push" for these change requests.
  - **Stack**: a change request in a stack follows the same steps. Its own Driver pushes and opens
    the draft pull request against the base that `take` printed. The stack driver only restacks
    later, as "Parallel Change Requests Orchestration" says.
  - **Open-pull-request cap**: the early draft counts in the user's cap of open pull requests
    (default 4). At the cap, the Driver pushes the branch and dispatches the heavy run without
    opening the pull request. It opens the pull request when a slot frees up, by the usual steps.
  - **Reading the run**: find it with
    `gh run list --workflow ci.yml --branch <branch> --event workflow_dispatch --json databaseId,headSha,status,conclusion`.
    Check that its `headSha` is the head that was pushed: a run at another head is not this run.
    For a red job, `gh run view <id> --log-failed` gives the log. The run is input to the next
    round; it never proves a later head green. A failure goes into the next round as the **CI**
    bullet says. A red `stress` job is advisory (rule 12 of [ci.guidelines.md](ci.guidelines.md))
    but still a flake to fix. When round 1 was approved and no round 2 follows, read the run
    before **Verify**.
  - **Re-dispatch**: the change request's own Driver dispatches the same command once after
    round 1, then once after each round that fixes a red `integration` or `stress` job of the
    early heavy run, after pushing that round. It never dispatches when the last heavy run is
    green. Rule 13 of [ci.guidelines.md](ci.guidelines.md) asks for a heavy run before merging a
    change to the extension host, the webview or the real-window tests: that run is the last green
    heavy run when the head has not changed since it ran. Otherwise dispatch one more run before
    ready. Each push to the draft pull request still runs the pull request CI as today.
  - **Unchanged**: the round limit (3, all causes together) still applies. The early push does not
    make the pull request ready: **Verify** still comes before ready.
- **CI**: a product or test failure is a new round with the log excerpt. An infra failure (setup,
  network) is re-run once. A failure the change does not touch and that passes on the re-run is a
  flake: name it (test, run id, symptom) in the report and file it in `1-inbox/` unless an item
  already covers it. Never weaken a test.
- **Verify**: before a pull request turns ready, a fresh Verifier proves, at the pushed head, each
  claim of `03-change-spec.md` with a command and its output; the evidence of the change (before on
  a detached worktree of the base, after at the head, light and dark when themes matter, or one line
  "no visible change" and the reason); and the posted pull request body, read with
  `gh pr view <n> --json title,body`, against the diff and
  [pull-request.guidelines.md](pull-request.guidelines.md) (every template section filled, Impacts
  holds the images or the "no visible change" line, "Autonomous decisions" exists). The verdict
  names the head SHA it ran on; a push after it makes it stale.
- **Round limit**: at most 3 rounds per change request, all causes together. Only the user grants
  more (written in `03-change-spec.md`, for example "rounds: 5").
- **Landing**: after the owner merges, remove the worktree and the CR branch (keep its screenshot
  branch, see [pull-request.guidelines.md](pull-request.guidelines.md)). The tracker issue closes by
  itself on merge and nobody closes it by hand; an issue left open is reported, not closed.
- **Rebase rule**: when any pull request merges, rebase every open CR branch on `origin/main` and
  push with `--force-with-lease`. This is the only allowed history rewrite. No merge commits.
- **Branch names** follow the change request, never the pull request; the change type (`feat`,
  `fix`, `docs`…) lives in the commit messages and the title, not in the branch name.
- **Worktrees**: one per change request, set up as in
  [local-worktree.guidelines.md](local-worktree.guidelines.md).

## Status table

The batch state (what is pending, active and done, and each change request's step, branch and pull
request) is chantier's: `chantier board` owns the status table, from the `summary.json` files. This
repository generates no status file.

## Parallel Change Requests Orchestration

Several change requests at once are a chantier batch (`4-batch/`). Open pull requests never exceed
the user's cap (default 4), every pull request of a stack counted; further change requests wait
locally until one merges. Several at once always ship as a stack (see
[stacked-prs.guidelines.md](stacked-prs.guidelines.md)). In stack mode a change request's coder and
review stop at the commit; one stack driver restacks, pushes with `--force-with-lease`, opens each
pull request against the branch below, links them and watches CI; only the user merges or disables
an auto-merge.

## Planning a release

The release is a change request like the others, in the planning folder; its steps (notes, thread,
heavy run on `main`, version commit, publishing, archive) are in
[release-process.guidelines.md](release-process.guidelines.md). The version commit stays away from
development: the stack of the release reaches `main` first, other merges wait until the release is
published, and no new change request starts meanwhile. The release driver asks the owner nothing
between the notes review and the publication, except a real blocker (round limit reached, a product
decision), merges only what the release guideline allows, and never enables auto-merge. The
"Released in" comments on the tracker issues are drafted after the publication, with one owner
approval for the whole list; only the Chief of Staff posts on a tracker issue, and only text the
owner approved.

## Constraints

- No agent starts a new backlog item: the user decides. Merges follow
  [pull-request.guidelines.md](pull-request.guidelines.md).
- Everything written to the repository or GitHub is in English, as the constitution requires.
- No agent runs `git stash`: the stash stack is shared by every worktree of the repository, so a
  `stash pop` can take another session's changes. Work is set aside with a commit, amended later.
- No agent stops processes by name or pattern (`pkill`, `killall`): other sessions' runs share
  the machine. An agent stops only a process it started, by its own id.
- An action a host may refuse runs in its own command, never chained with routine steps: one
  refusal must not block the steps around it.
- A behaviour change follows the requirements check of "Project bindings"; the report lists the
  requirement IDs with their source and test files.
- Sub-agents read `.agents/constitution.md` first; it ranks above their briefing. No installs, no
  network unless `AGENTS.md` allows it.
