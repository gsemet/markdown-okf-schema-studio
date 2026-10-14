# Journey Briefs

Use these briefs as goals, not click-by-click scripts. Assign two first-time and two experienced
author perspectives for every invocation. Keep the tester's context limited to their persona,
goal, synthetic fixture, user-facing extension documentation, run path, and action/time budget.
Do not preload code or E2E tests. Each tester gets a fresh workspace, profile, and extension
process.

| ID | Perspective | Theme | Window width | Fixture |
|----|-------------|-------|--------------|---------|
| J1 | First-time Markdown author | Light | 1440 px | `finding.md` |
| J2 | First-time OKF author | Dark | 1050 px | `finding.md` |
| J3 | Experienced Markdown/OKF author | Light | 1050 px | `finding.md` |
| J4 | Experienced author recovering a draft | Dark | 1440 px | `repair-me.md` |

Widths describe the requested VS Code content viewport. Record the measured viewport from the
helper; do not claim a narrow or normal layout if the actual width does not match the assignment.
The persona is an assignment prompt, not evidence from a real participant.

## J1: Find the Editor and Preview

**Persona:** New to this extension and unfamiliar with its commands.

**Goal:** Starting from the open synthetic Markdown document, find a way to preview it beside the
source. Determine whether the relationship between the editor, preview, and available authoring
controls is understandable. Make one small, meaningful content change if the workflow makes that
feel safe, then decide whether the result reflects the document you intended to write.

Observe discovery, naming, orientation, feedback, and any difference between the stock Markdown
preview and this extension. Do not name the command or prescribe a sequence in the prompt.

## J2: Preserve an Author's Intent

**Persona:** New to Markdown authoring in VS Code; familiar with writing documents elsewhere.

**Goal:** Revise the synthetic finding so its summary and body say what you intend. Explore how to
save, undo, and reopen the document; check whether comments, line breaks, and existing metadata are
preserved. Notice how the preview reflects changes and whether the UI makes the current save state
clear.

Observe discoverability, authoring feedback, consistency between source and preview, and recovery
from a mistaken edit. Let the author decide which content should change.

## J3: Navigate Rich Markdown and OKF Metadata

**Persona:** Experienced Markdown and structured-metadata author.

**Goal:** Use the document's headings, code, table, and frontmatter to find a useful editing flow.
Explore schema-backed metadata controls, nested values, and preview navigation as they appear.
Check whether keyboard and mouse use remain understandable when the editor pane is narrow.

Observe validation feedback, focus order, control labels, source/preview mapping, discoverability,
and workflow friction. Include one keyboard-led and one mouse-led interaction when practical.

## J4: Recover Without Losing the Draft

**Persona:** Experienced author with a longer document and an invalid metadata value to resolve.

**Goal:** Continue writing in `repair-me.md`. Work out what the visible warning or rendering state
means, correct the draft in a way that preserves the intended content, and return to a useful
preview. Check whether the extension explains the problem, keeps edits, and makes recovery
predictable.

Do not intentionally create a destructive condition or inspect diagnostics before observing a
visible problem. If the initial invalid metadata does not produce a visible issue, record that fact
and explore a naturally occurring error or classify the recovery scenario as untested.

## Shared Observation Rules

- Initial budget: stop at 15 minutes or 50 meaningful UI input actions, whichever comes first.
- Use the assigned disposable workspace and current screenshot to operate visible controls.
  Record both keyboard and mouse behavior, including focus when observable.
- Capture screenshots before and after meaningful state changes. Store them in the tester's
  `evidence/` directory and note what each image establishes.
- Record what worked and what did not. Separate visible facts from inferred feelings.
- After a visible issue is documented, use helper `inspect` or other diagnostics if they can
  explain it. Record the time and evidence separately. Do not use diagnostics to claim a workflow
  that was not completed through visible input.
- Report accessibility concerns as observations only. Do not claim compliance or human validation.

## Helper Launch

Launch from the repository root. Use one unique run directory per tester and the fixture listed in
the table:

```bash
fnm exec --using-file -- node \
  .agents/skills/markdown-studio-exploratory-qa/scripts/vscode-ui.mjs launch \
  --run-dir output/qa/markdown-okf-schema-studio/<timestamp>/testers/J1 \
  --theme light --width 1440 --document finding.md
```

Use `--theme dark --width 1050 --document finding.md` for J2 and
`--theme light --width 1050` for J3.
Use `--theme dark --width 1440 --document repair-me.md` for J4. Inspect the initial image
with an image-viewing tool before starting the assignment. Stop the instance and remove its
`instance/` directory after the tester's notes and evidence are saved.
