# Charters

A charter is one time-boxed exploration mission, run by one sub-agent with its own VS Code window.
The coordinator writes the charters, launches the agents, and only ever reads their short returns.
This keeps the coordinator's context small: in the first campaign, one thread did everything and
re-read about 400k tokens of context on each of 371 calls.

## Choosing charters

1. Run `python3 $SK/scripts/coverage-map.py`: it lists what the automated suites already cover and
   the use-case areas touched since the last campaign.
2. Pick 4–8 charters. Priority: areas changed since the last campaign, then areas never explored
   (the previous `QA-04` coverage note), then re-checks of open High findings.
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
- Budget: 40 driver calls, 6 screenshots, 45 minutes.
- Session: c3 (workspace ws-c3).
```

## Sub-agent prompt (copy and fill)

Launch with the Agent tool, `model: "sonnet"`, `effort: "medium"`; at most 2–3 at a time (the
machine's CPU skews timing probes).

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
- Stay within the budget. When it runs out, stop and report what is known.
- Write each confirmed finding as a sheet in <campaign>/<group>/ following
  references/bug-sheet-template.md (full sheet for High/Medium, short sheet for Low), with one
  evidence JPEG at most, and save its replay scenario as $SK/scenarios/<id>-<slug>.json.
  Use provisional IDs <session>-1, <session>-2; the coordinator renumbers.
- Never change product code or tests. Stop the window at the end (q stop, then pgrep -fl msq-).

Return at most 30 lines, nothing else:
  CHARTER <id>: <done|partial> — <calls used>/<budget> calls, <shots> shots
  FINDING <provisional id> | <High|Medium|Low> | <Reproduced|Observed once> | <title> | <sheet path> | <scenario path>
  GAP <test-campaign gap, if any> | <sheet path>
  NOT COVERED <journeys of the charter left untested>
```

## Coordinator after the returns

- Renumber the provisional IDs, merge duplicates across charters, and write `00-index.md` from the
  returned lines. Do not read the sheets in full unless a return is ambiguous.
- Re-check every High with its replay scenario (`q scenario <id>-….json`), not by exploring again.
- If a charter returns `partial`, decide whether a follow-up charter is worth its budget; do not
  continue it in the coordinator's thread.
