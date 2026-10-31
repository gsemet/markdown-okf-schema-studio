# Charters

A charter is one time-boxed exploration mission, run by one sub-agent with its own VS Code window.
The Foreman writes the charters and groups related ones; a QA Driver per group launches the charter
agents and replays their High candidates; the Foreman only ever reads the Drivers' short returns.
This keeps the Foreman's context small: in the first campaign, one thread did everything and
re-read about 400k tokens of context on each of 371 calls.

## Choosing charters

1. Run `python3 $SK/scripts/coverage-map.py`: it lists what the automated suites already cover and
   the use-case areas touched since the last campaign. Run `python3 $SK/scripts/new-features.py`
   for the PRs merged since then (the new-feature coverage table).
2. Pick 4–8 charters. Priority: **new features** (one charter per user-facing PR or small group of
   PRs, unless an automated test covers it: then write `automated: <test>` in the table), then
   areas changed since the last campaign, then areas never explored (the previous `QA-04` coverage
   note), then re-checks of open High findings. New-feature charters run first.
   Group related charters for the QA Drivers (same area or corpus).
3. Aim each charter at what the automated campaign misses by construction:
   - **Real documents.** Book chapters, OKF examples, vault copies instead of small fixtures.
   - **State combinations.** Mode switches, focus moving between panes, reload or re-render during
     an edit, two views on one document.
   - **Concurrency and outside changes.** Source and inline edits on the same block, an external
     rewrite while an editor is open, rename or delete of the previewed file.
   - **Time.** Typing speed versus debounce, long sessions, rapid undo/redo.
   - **Judgement.** Conventions (VS Code, Obsidian, spreadsheets), discoverability, wording, visual
     clarity. Only a human or a model can judge these, so spend the screenshots here.
4. Skip journeys that a real-input E2E scenario or a visual machine check already asserts,
   unless the charter changes the corpus or the state combination.

## Charter format

```markdown
### C3 — Tables on real chapters
- Mission: edit tables of the book chapters the way an author does, beyond the synthetic fixture.
- Areas: D3, B6. Corpus: book/chapters/06-*.md, 08-*.md (QA copies). Mode: side preview.
- Not covered by: realInput "table cell enter", "table minimal diff" (small fixture only).
- Oracles: diff against mark (only the edited row changes), errors, inViewport toolbar, noClip cells.
- New feature: PR #NNN <title> (omit when the charter is not about a merged PR).
- Budget: 40 driver calls, 6 screenshots, 45 minutes.
- Session: c3 (workspace ws-c3).
```

## QA Driver prompt (copy and fill)

The Foreman launches one QA Driver per group of related charters with the Agent tool,
`model: "sonnet"`, `effort: "medium"`. Several Drivers run in parallel; all Drivers together keep at
most 2–3 VS Code windows open (the machine's CPU skews timing probes), so state each Driver's
window allowance.

```text
You are a QA Driver for an exploratory QA campaign on the Markdown OKF-Schema Studio VS Code
extension. You own the group of charters below. You do not drive a window yourself: you launch one
charter agent per charter and replay High candidates.
Read first: .agents/skills/markdown-studio-exploratory-qa-claude/SKILL.md (Roles, Workflow,
Budgets), references/charters.md (the charter prompt below), references/harness-pitfalls.md.

Campaign folder: <campaign> (sheets go in <campaign>/<group>/). Environment to export:
  QA_CHANGES_ROOT=<changes root, when .agents/changes is not in this checkout>
Charters (in this order; new-feature charters first):
<paste the charter blocks>
Window allowance: <n> charter windows at a time (the Foreman keeps the campaign total at 2–3).

Method:
- Launch one charter agent per charter (Agent tool, model sonnet, effort medium) with the charter
  prompt of references/charters.md, session name = the charter's session. Never run two charters
  on one window or one workspace clone; never exceed your window allowance; wait for a charter to
  finish before starting one beyond the allowance.
- Read only the charter returns. Open a sheet only when a return is ambiguous.
- Replay each High candidate of your charters once with its scenario from a fresh session
  (QA_SESSION=<driver>-replay, own workspace clone), then stop that window. The replay window
  counts against your window allowance: replay only when none of your charter windows is open.
  Label what you could not reproduce "Observed once".
- If you cannot start sub-agents in this harness, run your charters yourself, one after the other,
  with the charter prompt below (still one window at a time); the Foreman may instead launch the
  charter agents of your group itself, and your step then reduces to replay and merge.
- Merge duplicates inside your group. A `partial` charter: start a follow-up charter only if the
  remaining budget allows, else list it under NOT COVERED.
- Never change product code or tests. At the end run `pgrep -fl msq-` and stop windows you left.

Return at most 40 lines, nothing else:
  DRIVER <group>: <done|partial> — <charters done>/<charters planned>, <replays done>
  CHARTER <id>: <done|partial> — <calls used>/<budget> calls
  FINDING <provisional id> | <High|Medium|Low> | <Reproduced|Observed once> | <Bug|Gap|Decision> | <title> | <sheet path> | <scenario path> | <currently jpg> | <expected jpg or "diff" or "none: <reason>">
  NEWFEATURE <PR> | <feature> | <charter id or "automated: <test>"> | <PASS|finding ids|not run>
  GAP <test-campaign gap, if any> | <sheet path>
  NOT COVERED <journeys left untested>
```

## Charter agent prompt (copy and fill)

The QA Driver launches each charter agent with the Agent tool, `model: "sonnet"`,
`effort: "medium"`, inside its window allowance.

```text
You run one exploratory QA charter on the Markdown OKF-Schema Studio VS Code extension.
Read first: .agents/skills/markdown-studio-exploratory-qa-claude/SKILL.md (sections Rules and
Driver), references/harness-pitfalls.md, references/scenario-format.md.

Charter:
<paste the charter block>

Setup, once:
  SK=.agents/skills/markdown-studio-exploratory-qa-claude
  $SK/scripts/setup-workspace.sh --clone <session>
  QA_SESSION=<session> $SK/scripts/q launch --name <session> --ws <session>
  QA_SESSION=<session> $SK/scripts/q run observe.mjs   (in the background)
  QA_SESSION=<session> $SK/scripts/q doctor            (every line OK or INFO before going on)
Prefix every driver call with QA_SESSION=<session>.

Method:
- Prefer `q scenario` files (write them under runs/<session>/scenarios-src/) with checks over
  single commands. Open a screenshot only when a check fails or when the charter needs a visual
  judgement; take shots with --clip preview.
- Use `q spy --diff FILE --against mark` instead of `q spy --text`.
- Verify before reporting: re-run each High candidate once from a clean state.
- For each finding capture both shots of its Currently / Expected block (see
  references/qa-bug-template.md): `q shot <id>-currently --clip preview` (or a tighter clip) of
  the symptom, then the Expected shot: the working case, else the same shot annotated, else (buffer
  defect) two code blocks in the sheet. If no visual is possible, say why in one line and give
  measurements.
- Before writing a sheet, search `requirements/` (`okfreq` or grep on the area and keywords) and
  record the matching IDs. No match is a **Gap**, the main target of the campaign: report it. A
  requirement that specifies the observed behaviour makes it a **Decision** (an owner question).
  Fill `Verdict`, `Requirements` and a "Why this is wrong" section (3 to 6 lines: what the author
  was doing and what it costs, which expectation breaks and its source, why an author would not
  accept it); Expected names its source.
- How to annotate: when no working case exists, outline the symptom and the missing behaviour with
  the driver, no ImageMagick:
  `q shot <id>-currently --clip preview --annotate 'aside[data-okf-github-alert] ~ p'
  --note 'Defect: lazy line leaves the Note' --color red --annotate 'blockquote'
  --note 'Works: quote keeps it' --color green`
  (`--annotate`, `--note`, `--color` repeat and pair by position; red = defect, green = expected).
  Check the printed boxes and open the image once. A label can cover nearby text that is not
  annotated: shorten or drop the note if it hides something that matters.
- Propose a test or a requirement only when the defect could come back silently and no existing
  test is close; otherwise write "No test: <reason>". Each proposal ends with
  `Uncheck to disagree: [x]`.
- Stay within the budget. When it runs out, stop and report what is known.
- Write each confirmed finding as a sheet in <campaign>/<group>/ following
  references/qa-bug-template.md (full sheet for High/Medium, short sheet for Low), starting with
  its Currently / Expected block and at most two evidence JPEGs (currently + expected, clipped to
  about 1000 px), and save its replay scenario as $SK/scenarios/<id>-<slug>.json.
  Use provisional IDs <session>-1, <session>-2; the Foreman renumbers.
- Never change product code or tests. Stop the window at the end (q stop, then pgrep -fl msq-).
- For a new-feature charter, add a NEWFEATURE line to the return naming the PR behaviours you
  exercised and the result.

Return at most 30 lines, nothing else:
  CHARTER <id>: <done|partial> — <calls used>/<budget> calls, <shots> shots
  FINDING <provisional id> | <High|Medium|Low> | <Reproduced|Observed once> | <Bug|Gap|Decision> | <title> | <sheet path> | <scenario path> | <currently jpg> | <expected jpg, "diff", or "none: <reason>">
  NEWFEATURE <PR> | <behaviours exercised> | <PASS|finding ids|not run>
  GAP <test-campaign gap, if any> | <sheet path>
  NOT COVERED <journeys of the charter left untested>
```

## Foreman after the returns

- Renumber the provisional IDs, merge duplicates across Drivers, and write `00-index.md` from the
  returned lines (including the new-feature coverage table from the `NEWFEATURE` lines). Do not
  read the sheets in full unless a return is ambiguous.
- A user-facing PR with no charter and no automated test is a gap: list it under Limits and do not
  mark the campaign `completed`.
- The Drivers already replayed their High candidates; re-run one only if a return is ambiguous.
- If a Driver returns `partial`, decide whether a follow-up charter is worth its budget; do not
  continue it in the Foreman's thread.
