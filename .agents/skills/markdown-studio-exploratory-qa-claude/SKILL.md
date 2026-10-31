---
name: markdown-studio-exploratory-qa-claude
description: This skill should be used when asked to run, resume, or re-validate an exploratory QA campaign on the Markdown OKF-Schema Studio VS Code extension in a real VS Code window (real mouse and keyboard through CDP), and to write one bug sheet per finding under .agents/changes/03-requests/. A Foreman picks charters from a coverage map and the PRs merged since the last campaign, hands groups of charters to QA Driver sub-agents, and each Driver runs charter agents that drive their own window with scenario files and automatic checks. It ships the driver, scenario engine, no-op sweep, a read-only spy extension, synthetic fixtures, a use-case catalogue, and the harness pitfalls learned in previous campaigns.
compatibility: macOS with Visual Studio Code installed at /Applications, fnm with Node 24, the extension's node_modules (playwright-core), rsync, git, sips.
metadata:
  owner: "Gaetan Semet <gaetan.semet@ampere.cars>"
  keywords: [markdown, okf, studio, vscode, exploratory, qa, ux, cdp]
  previous-campaigns: [".agents/changes/04-archives/001-deep-UX-analysis/", ".agents/changes/04-archives/210-qa-campaign-2026-10-31/"]
---

# Markdown Studio Exploratory QA (Claude)

## Purpose

A campaign exists to find **bad behaviours that no test and no requirement covers yet**. A finding
with no requirement (a **Gap**) is the main target, not a weaker kind of bug. Searching
`requirements/` only tells a real gap (nothing specified) apart from a **Decision** (a requirement
says the opposite); it must never discourage reporting.

Use the extension the way an author does every day, in a real VS Code window, and report the
frictions, defects, and test gaps that the automated campaign misses. Inputs are real mouse and
keyboard events; the spy extension gives the ground truth of the buffer.

Cost is roughly *agent turns × context size*. The first campaign ran 371 turns in one thread
with about 400k tokens of context each. This skill keeps the Foreman's context small,
delegates exploration to QA Drivers and short-lived charter agents, and replaces chains of single
commands and screenshots with scenario files whose checks print one line each.

## Rules

- **Report only by default.** Do not change product code or tests unless the user asks. Bugs in
  test asserts are reported in a `08-test-campaign-gaps/` group.
- **Copies only.** Work in the QA workspaces built by `scripts/setup-workspace.sh`, never on the
  originals.
- **Private content stays out of the repository.** Vault copies may be used for exploration, but
  their screenshots never go into `evidence/`; reproduce such findings on a synthetic fixture.
- **Real input.** Actions go through real mouse and keyboard events (driver commands or scenario
  steps). Never call extension test hooks or post webview messages to simulate the user.
- **Verify before reporting.** Every editing scenario ends with a `diff` check against the disk or
  a mark. Re-run each High finding once from a clean state; label anything seen once as such.
- **Do not re-explore what is automated.** Skip journeys that a real-input E2E scenario or a
  visual machine check already asserts, unless the corpus or the state combination differs.
- **Budgets are hard limits** (see [Budgets](#budgets)). When one runs out, report what is known.
- **Stop when asked.** Write the report with what is known, mark it `partial`, and list untested
  areas.

## Roles

| Role | Who | Context | Does |
| --- | --- | --- | --- |
| Foreman | Main thread (Opus) | Coverage map, new-feature table, Driver returns, index | Scope, charters, launches the QA Drivers, triage, `00-index.md` |
| QA Driver | One sub-agent per group of related charters (Sonnet, effort medium) | Its charters, its charter returns | Launches one charter agent per charter, replays its own High candidates, returns ≤ 40 lines |
| Charter agent | One sub-agent per charter (Sonnet, effort medium), started by its Driver | Its charter only | Drives its own window, writes sheets and replay scenarios, returns ≤ 30 lines |
| Sweep agent | Charter C0, run through a Driver, same model | Script output only | Runs the scripted sweeps on real documents, returns failing targets |

The chain is Foreman → QA Driver(s) → charter agents. The Foreman never opens a screenshot and
never drives VS Code beyond the smoke check. **Several QA Drivers run in parallel**; the limit is
the machine's window budget: 2 or 3 VS Code windows at a time across *all* Drivers (see
[Budgets](#budgets)). Group charters so that a Driver's charters share an area or a corpus, and give
the new-feature charters to the first Driver(s).

## Workflow

### 1. Scope (Foreman)

```bash
SK=.agents/skills/markdown-studio-exploratory-qa-claude
python3 $SK/scripts/coverage-map.py            # automated coverage + areas changed since last campaign
python3 $SK/scripts/new-features.py            # PRs merged since the last campaign: coverage table
git rev-parse --short HEAD; git status --short
```

`coverage-map.py` takes its baseline from the revision recorded in the previous campaign's
`00-index.md` (a line `Revision: ` plus the sha in backticks, or the prose "at commit " plus the sha
in backticks), else from the newest archived QA campaign. `.agents/changes` is git-ignored, so in a
worktree point the scripts at the main checkout with
`export QA_CHANGES_ROOT=<main-checkout>/.agents/changes`, or pass `--campaign DIR` (both scripts;
`new-features.py` also takes `--since DATE`, `--repo`, `--dry-run` to print the `gh` command without
calling it, and `--json-file` for saved `gh` output). A
sha that is not an ancestor of HEAD is reported and skipped.

`new-features.py` runs `gh pr list --state merged --search "merged:>=DATE"` and prints the
**new-feature coverage table** (PR, feature, charter, result) and a list of PRs that look
non-user-facing (chore/ci/build/test/docs titles or labels); confirm that list by hand. Every other
user-facing PR needs a charter or an automated test: write the **new-feature charters first** and
run them first. Read the previous campaign's `00-index.md` findings table and its coverage note
(`QA-04`), not the sheets. Then write 4–8 charters following
[references/charters.md](references/charters.md): new features first, changed areas next,
never-explored journeys after, open High findings to replay last. Group them for the QA Drivers, one
Driver per group of related charters. Record the revision and whether the extension tree is dirty;
the report states both.

### 2. Prepare (Foreman, once)

```bash
fnm exec -- npm run compile && fnm exec -- npm run bundle
BOOK_DIR=~/Projects/Nestor/agentic-coding-white-paper/book \
  VAULT_DIR=~/Projects/Obsidian/obsidian-private-vault $SK/scripts/setup-workspace.sh --force
QA_SESSION=smoke $SK/scripts/q launch --name smoke
QA_SESSION=smoke $SK/scripts/q run observe.mjs &        # console + navigation log (background)
QA_SESSION=smoke $SK/scripts/q doctor
QA_SESSION=smoke $SK/scripts/q scenario smoke
QA_SESSION=smoke $SK/scripts/q stop
```

Continue only when `doctor` shows no `FAIL` and the smoke scenario passes. Open its screenshot once
to confirm a real workbench with a rendered preview.

`setup-workspace.sh` builds `$QA_ROOT/ws` (default `output/qa/markdown-studio-claude/ws`) with no
manual step; every corpus is an environment variable and a missing source is skipped with a message:

| Variable | Copied to | Default |
| --- | --- | --- |
| `QA_ROOT` | output root | `<repo>/output/qa/markdown-studio-claude` |
| `BOOK_DIR` | `book/` | `~/Projects/Nestor/agentic-coding-white-paper/book` when present; `BOOK_DIR=""` skips it |
| `VISUAL_DIR` | `fixtures-visual/` | `<repo>/test/visual/fixtures` |
| `DOCS_DIR` | `docs/` | `<repo>/docs` |
| `SYNTH_DIR` | `synth/` | the skill's `assets/synth` |
| `FIXTURES_QA_DIR` | `fixtures-qa/` | the sibling QA skill's `assets/fixtures` when present |
| `VAULT_DIR` | `vault/` (only `*.md`) | unset: not copied |

The okf-schema repository is never copied. `setup-workspace.sh --clone NAME` copies the built
workspace to `ws-NAME` for one charter.

### 3. Sweeps (charter C0, through a QA Driver)

Scripted checks over real documents, without an agent decision per step. C0 is a charter like any
other: put it in a Driver's group (the Driver launches it with the charter prompt in
[references/charters.md](references/charters.md)), with this mission: for each
of 3–5 chapters and `synth/tables.md`, `synth/frontmatter-edge.md`, open the side preview and run

```bash
QA_SESSION=c0 $SK/scripts/q run noop-sweep.mjs <file> all      # open + commit without typing: buffer must not change
QA_SESSION=c0 $SK/scripts/q run latency-probe.mjs 12            # on the largest chapter, source editor focused
```

then reproduce each `CHANGED` target once and write sheets for the real ones. A long chapter can
take several minutes: use `--limit`/`--from` to split it, or run the command in the background.
The sweep clicks each block only where no link sits under the pointer (checked in the page with
`elementFromPoint`); a link-only block is clicked beside its link, and skipped (counted as
"link-only skipped") only when every candidate point is on a link (`--follow-links` clicks them
anyway). If a click still navigates to another document (the shown document id changes), the sweep
expands the collapsed toolbar, clicks the preview's own Back button and waits for the original
document id, or stops the whole sweep with an error (report marked aborted, non-zero exit).

### 4. QA Drivers (sub-agents, in parallel)

The Foreman launches one **QA Driver** per group of related charters with the QA Driver prompt of
[references/charters.md](references/charters.md) (Agent tool, Sonnet, effort medium). Several
Drivers run in parallel, but all Drivers together keep at most 2–3 VS Code windows open: give each
Driver a window allowance (for example 2 Drivers × 1 charter window at a time, or 1 Driver × 3)
and start the new-feature Driver first. A Driver works through its group in that order.

### 5. Charters, replay and triage

Each Driver launches **one charter agent per charter** with the charter prompt of
[references/charters.md](references/charters.md). The charter agent clones its own workspace,
launches its own window under `QA_SESSION=<charter>`, works mostly through `q scenario` files
([references/scenario-format.md](references/scenario-format.md)), writes its sheets and replay
scenarios, stops its window, and returns at most 30 lines. The Driver then **replays its own High
candidates** (`q scenario <id>-<slug>.json` in a fresh session), merges duplicates inside its
group, and returns at most 40 lines to the Foreman. A `partial` charter gets a follow-up charter
from the Driver if it is worth the budget.

Before writing a sheet, the charter agent searches `requirements/` (`okfreq`, or grep on the area
and keywords) and records the matching IDs in the sheet's `Requirements:` field (`none found` is an
answer). Every sheet has a **Verdict** (`Bug`, `Gap` or `Decision`, defined in
[references/qa-bug-template.md](references/qa-bug-template.md)), a **Why this is wrong** section of
3 to 6 lines right after Currently / Expected, and an Expected that names its source (a requirement
ID, an invariant, an in-product working case or a convention). A **Decision** is never filed as a
bug: it is an owner question.

Proposals follow a balance rule: propose a test only when the defect could come back silently and no
existing test is close (data loss, buffer diff, regression of a fixed bug, invariant); requirements
follow the same rule. Each proposal section ends with `Uncheck to disagree: [x]` and the fix CR
carries out only the sections still ticked. A section that offers several approaches is a radio
group with the recommended one preselected `(x)` instead; a fix CR asks the owner when a group has
no `(x)` or more than one.

**Triage (coordinator).** Read "Why this is wrong" first. A weak reason sends the sheet back to the
charter agent, or downgrades it to Low as an intent question. A Bug with a cited requirement carries
that ID into the backlog item; a Gap becomes a backlog item as is; Decisions go to the owner.

Every sheet starts with a **Currently / Expected** block (two columns, an image or diff each side,
one caption line each): Currently is a clipped shot of the symptom, mandatory when the symptom is
visible; Expected is the working case, the same shot annotated, or a pair of code blocks for a
buffer defect. When a finding becomes a backlog item, its `01-intent.md` copies the block with
links to the archived images, and the Currently shot is the before-shot the fix PR must
reproduce. The FINDING lines of the returns carry the evidence paths, so triage needs no sheet.

The Foreman works from the Driver returns only: renumber provisional IDs, merge duplicates across
Drivers, fill the new-feature coverage table (charter or `automated: <test>`, result), and open a
sheet only when a return is ambiguous. It never continues a `partial` charter in its own thread
and never drives a window except the smoke check.

### 6. Report

Write the index and the sheets as described in
[qa-bug-template.md](references/qa-bug-template.md) (the owner reads them in the Studio).

Under `.agents/changes/03-requests/<campaign-folder>/` (for a follow-up, a new folder or a `part-N/`
subfolder linked from the previous index):

- `00-index.md`: date, revision, status (`partial`/`completed`), summary, findings table sorted by
  severity with an `approved` column (`[ ]`), **Decisions for the owner** (the findings whose
  verdict is `Decision`, each with its requirement ID and the question), the **new-feature coverage
  table**, severity scale (with the line "an intent question is Low unless data is lost"),
  method, QA Drivers and charters run with their budgets used, limits, and **Tests to promote**: the
  replay scenarios that should become product E2E tests, so the next campaign does not explore them
  again.
- One subfolder per logical group (`01-inline-block-editing/`, `02-table-editing/`, …) with one
  file per bug, following [references/qa-bug-template.md](references/qa-bug-template.md):
  full sheet for High/Medium, short sheet for Low.
- `08-test-campaign-gaps/` for wrong or missing asserts and the coverage note (what was and was
  not exercised, per charter).
- `evidence/`: at most two JPEGs per finding, the **Currently** and **Expected** shots of the
  sheet's first block (shots are already JPEG at 1000 px; use `q shot NAME --clip preview` or a
  tighter clip). See [references/qa-bug-template.md](references/qa-bug-template.md).
- Replay scenarios stay in `$SK/scenarios/`, named after the finding ID.

**Header lines of `00-index.md`** (the next campaign's scripts read them):

```markdown
Date: 2026-10-31. Subject: markdown-okf-schema-studio at commit `b9118506` (main, clean tree).
Revision: `b9118506`
Status: **completed**
```

`Revision:` is the canonical line (the sha of the tested build, in backticks); the prose "at commit"
form is also read. `Date:` is read by `new-features.py`.

**New-feature coverage table**, one row per merged user-facing PR since the previous campaign
(start from the `new-features.py` output):

```markdown
| PR | Feature | Charter | Result |
| --- | --- | --- | --- |
| [#301](https://…/pull/301) | Sticky table headers | C2 | PASS |
| [#305](https://…/pull/305) | Esc cancels the link panel | automated: realInput "link panel" | PASS |
```

A merged user-facing PR with neither a charter nor an automated test is a **gap**: list it under
Limits, and the campaign status cannot be `completed` (use `partial`).

Check every relative link before finishing.

### 7. Clean up

```bash
pgrep -fl msq- || true                                   # no isolated VS Code left
command rm -rf output/qa/markdown-studio-claude/ws-*     # charter workspace clones
```

Keep `output/qa/markdown-studio-claude/runs/` until the report is reviewed, then delete it.
Profiles in `$TMPDIR/msq-*` can be removed.

## Budgets

| Scope | Budget |
| --- | --- |
| Campaign | 8 charters plus C0; stop and report after that, even if areas remain (list them) |
| Windows | 2–3 VS Code windows open at a time across all Drivers; check with `pgrep -fl msq-` |
| Foreman | Under about 80k tokens of context; no screenshots; no driving except the smoke check |
| QA Driver (one row per Driver) | Its charters one after another within its window allowance; 1 replay of each of its High candidates; reads only charter returns; returns ≤ 40 lines |
| Charter | 40 driver calls, 6 screenshots opened, 45 minutes; one replay of each High candidate |
| Resume | A stopped campaign restarts in a new session from `00-index.md` and the Driver returns, not with `/compact` |

## Driver

All commands act on the session named by `QA_SESSION`, else `--session <name>`, else the last
launched one. Prefix every call with `QA_SESSION=<name>` when several windows run.

| Command | Effect |
| --- | --- |
| `launch --name N [--ws N] [--theme light] [--userData DIR] [--untrusted] [--workspace DIR]` | Start an isolated VS Code with the extension and the spy; `--ws N` uses the `ws-N` clone |
| `doctor` | Pre-flight: one OK/WARN/FAIL line per harness pitfall |
| `scenario FILE [--file F] [--var k=v] [--keep-going]` | Run a JSON scenario of steps and checks in one connection |
| `check '<json>' [--since S]` | Run checks only (oracles over the last S seconds) |
| `stop` | Terminate the session's VS Code (SIGTERM, then SIGKILL) |
| `use NAME` | Make another session current (single-agent use only) |
| `shot NAME [--clip preview\|x,y,w,h\|SELECTOR] [--png] [--px 1000] [--annotate SEL\|x,y,w,h --note TEXT --color red\|green]…` | Screenshot, JPEG by default; `--annotate` (repeatable, `--note` and `--color` pair by position) outlines the element in the shot, boxes printed (see [How to annotate](references/qa-bug-template.md#how-to-annotate)) |
| `click X Y [--right] [--count 2]`, `dblclick X Y`, `move X Y`, `drag X1 Y1 X2 Y2` | Real mouse input |
| `wheel X Y DY [--steps N]` | Mouse wheel |
| `key CHORD...` | Key presses (`Meta+s`, `Escape`, `ArrowDown`) |
| `type TEXT [--delay ms]` | Per-character typing (`\n` for Enter) |
| `insert TEXT` | Paste-like insertion in one event |
| `palette TEXT` | Run a command by name |
| `open FILE` | Quick Open and Enter |
| `seq step...` | Legacy multi-step form (`key:`, `type:`, `wait:`, `click:x,y`, `dbl:x,y`, `shot:`, `rows`, `pick:label`); prefer `scenario` |
| `frames` | Visible/hidden webviews with geometry |
| `box SELECTOR [--limit N]`, `clicksel SELECTOR [--nth i]` | Locate preview elements in window coordinates; click one |
| `feval JS` / `peval JS` | Evaluate in the visible preview (`D`, `W`, `box(el)`) / in the workbench page |
| `notifs` | Visible notification toasts |
| `spy` | One-line summary of the active editor, tabs, and documents (`--json` for the full state) |
| `spy --diff SUFFIX [--against disk\|mark]`, `spy --mark SUFFIX` | Diff of the live buffer; save a baseline |
| `spy --text SUFFIX [--lines A-B]` | Part of the live buffer (prefer `--diff`) |
| `run SCRIPT [args]` | Run a scenario module with `{ page, wv, shot, ctx, readSpy, lineDiff, … }` |

Every input command accepts `--wait ms` and `--shot NAME` (with `--clip`). Outputs are capped at
2000 characters; `--full` lifts the cap.

Scripts (`q run <script>`):

- `noop-sweep.mjs <file> [blocks|cells|fields|all] [--limit N] [--from N] [--shots]
  [--follow-links]`:
  open and commit every editable target without typing; reports the targets that changed the buffer.
  Skips a block only when every click point is on a link; `--limit` bounds each kind.
- `probe-blocks.mjs '<json selectors>' <prefix>`: what the inline editor opened for each selector;
  pipe to `python3 $SK/scripts/fmt-probe.py`.
- `flicker-probe.mjs "<text>" <prefix>`: DOM sampling while typing (Mermaid, KaTeX, height, scroll).
- `latency-probe.mjs <n>`: per-keystroke latency until the preview shows the typed text.
- `filmstrip.mjs "<text>" <prefix>`: rapid screenshots while typing (coarse; see pitfalls).

Read [references/harness-pitfalls.md](references/harness-pitfalls.md) before the first launch.
