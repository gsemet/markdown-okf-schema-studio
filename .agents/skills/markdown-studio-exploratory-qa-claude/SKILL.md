---
name: markdown-studio-exploratory-qa-claude
description: This skill should be used when asked to run, resume, or re-validate an exploratory QA campaign on the Markdown OKF-Schema Studio VS Code extension in a real VS Code window (real mouse and keyboard through CDP), and to write one bug sheet per finding under .agents/changes/requests/. A coordinator picks charters from a coverage map and delegates each to a sub-agent that drives its own window with scenario files and automatic checks. It ships the driver, scenario engine, no-op sweep, a read-only spy extension, synthetic fixtures, a use-case catalogue, and the harness pitfalls learned in previous campaigns.
compatibility: macOS with Visual Studio Code installed at /Applications, fnm with Node 24, the extension's node_modules (playwright-core), rsync, git, sips.
metadata:
  owner: "Gaetan Semet <gaetan.semet@ampere.cars>"
  keywords: [markdown, okf, studio, vscode, exploratory, qa, ux, cdp]
  previous-campaigns: [".agents/changes/requests/deep-UX-analysis/"]
---

# Markdown Studio Exploratory QA (Claude)

## Purpose

Use the extension the way an author does every day, in a real VS Code window, and report the
frictions, defects, and test gaps that the automated campaign misses. Inputs are real mouse and
keyboard events; the spy extension gives the ground truth of the buffer.

Cost is roughly *agent turns × context size*. The first campaign ran 371 turns in one thread
with about 400k tokens of context each. This skill keeps the coordinator's context small,
delegates exploration to short-lived sub-agents, and replaces chains of single commands and
screenshots with scenario files whose checks print one line each.

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
| Coordinator | Main thread (Opus) | Coverage map, charter returns, index | Scope, charters, triage, replays, `00-index.md` |
| Charter agent | One sub-agent per charter (Sonnet, effort medium) | Its charter only | Drives its own window, writes sheets and replay scenarios, returns ≤ 30 lines |
| Sweep agent | Charter C0, same model | Script output only | Runs the scripted sweeps on real documents, returns failing targets |

The coordinator never opens a screenshot and never drives VS Code beyond a smoke check.

## Workflow

### 1. Scope (coordinator)

```bash
SK=.agents/skills/markdown-studio-exploratory-qa-claude
python3 $SK/scripts/coverage-map.py            # automated coverage + areas changed since last campaign
git rev-parse --short HEAD; git status --short
```

Read the previous campaign's `00-index.md` findings table and its coverage note (`QA-04`), not the
sheets. Then write 4–8 charters following [references/charters.md](references/charters.md):
changed areas first, never-explored journeys next, open High findings to replay last. Record the
revision and whether the extension tree is dirty; the report states both.

### 2. Prepare (coordinator, once)

```bash
fnm exec -- npm run compile && fnm exec -- npm run bundle
VAULT_DIR=~/Projects/Obsidian/obsidian-private-vault $SK/scripts/setup-workspace.sh --force
QA_SESSION=smoke $SK/scripts/q launch --name smoke
QA_SESSION=smoke $SK/scripts/q run observe.mjs &        # console + navigation log (background)
QA_SESSION=smoke $SK/scripts/q doctor
QA_SESSION=smoke $SK/scripts/q scenario smoke
QA_SESSION=smoke $SK/scripts/q stop
```

Continue only when `doctor` shows no `FAIL` and the smoke scenario passes. Open its screenshot once
to confirm a real workbench with a rendered preview.

### 3. Sweeps (charter C0)

Scripted checks over real documents, without an agent decision per step. Launch C0 like any
charter (prompt in [references/charters.md](references/charters.md)), with this mission: for each
of 3–5 chapters and `synth/tables.md`, `synth/frontmatter-edge.md`, open the side preview and run

```bash
QA_SESSION=c0 $SK/scripts/q run noop-sweep.mjs <file> all      # open + commit without typing: buffer must not change
QA_SESSION=c0 $SK/scripts/q run latency-probe.mjs 12            # on the largest chapter, source editor focused
```

then reproduce each `CHANGED` target once and write sheets for the real ones. A long chapter can
take several minutes: use `--limit`/`--from` to split it, or run the command in the background.

### 4. Charters (sub-agents)

Launch one sub-agent per charter with the prompt template of
[references/charters.md](references/charters.md); at most 2–3 at a time. Each one clones its own
workspace, launches its own window under `QA_SESSION=<charter>`, works mostly through
`q scenario` files ([references/scenario-format.md](references/scenario-format.md)), writes its
sheets and replay scenarios, stops its window, and returns at most 30 lines.

### 5. Triage and replay (coordinator)

From the returns only: renumber provisional IDs, merge duplicates, and replay every High with its
scenario (`q scenario <id>-<slug>.json` in a fresh session). Open a sheet only when a return is
ambiguous. A `partial` charter gets a follow-up charter if it is worth its budget; never continue
it in the coordinator's thread.

### 6. Report

Under `.agents/changes/requests/<campaign-folder>/` (for a follow-up, a new folder or a `part-N/`
subfolder linked from the previous index):

- `00-index.md`: date, commit, status (`partial`/`completed`), summary, findings table sorted by
  severity with an `approved` column (`[ ]`), severity scale, method, charters run with their
  budgets used, limits, and **Tests to promote**: the replay scenarios that should become product
  E2E tests, so the next campaign does not explore them again.
- One subfolder per logical group (`01-inline-block-editing/`, `02-table-editing/`, …) with one
  file per bug, following [references/bug-sheet-template.md](references/bug-sheet-template.md):
  full sheet for High/Medium, short sheet for Low.
- `08-test-campaign-gaps/` for wrong or missing asserts and the coverage note (what was and was
  not exercised, per charter).
- `evidence/`: at most one JPEG per finding (shots are already JPEG at 1000 px; use `--clip`).
- Replay scenarios stay in `$SK/scenarios/`, named after the finding ID.

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
| Charter | 40 driver calls, 6 screenshots opened, 45 minutes; one replay of each High candidate |
| Coordinator | Under about 80k tokens of context; no screenshots; no driving except the smoke check |
| Resume | A stopped campaign restarts in a new session from `00-index.md` and the charter returns, not with `/compact` |

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
| `shot NAME [--clip preview\|x,y,w,h\|SELECTOR] [--png] [--px 1000]` | Screenshot, JPEG by default |
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

- `noop-sweep.mjs <file> [blocks|cells|fields|all] [--limit N] [--from N] [--shots]`: open and
  commit every editable target without typing; reports the targets that changed the buffer.
- `probe-blocks.mjs '<json selectors>' <prefix>`: what the inline editor opened for each selector;
  pipe to `python3 $SK/scripts/fmt-probe.py`.
- `flicker-probe.mjs "<text>" <prefix>`: DOM sampling while typing (Mermaid, KaTeX, height, scroll).
- `latency-probe.mjs <n>`: per-keystroke latency until the preview shows the typed text.
- `filmstrip.mjs "<text>" <prefix>`: rapid screenshots while typing (coarse; see pitfalls).

Read [references/harness-pitfalls.md](references/harness-pitfalls.md) before the first launch.
