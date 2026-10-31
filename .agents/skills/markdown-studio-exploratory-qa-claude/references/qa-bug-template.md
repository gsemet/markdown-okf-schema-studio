# QA bug template

One template for every QA bug. The same text is the campaign sheet and, after triage, the backlog
item's `01-intent.md`: the coordinator copies it as is and appends the priority to the line under
the title ("· P2"). There is no front matter and no second format. Every sheet names its replay
scenario: the next campaign re-checks the finding by running it, not by exploring again.

> [!NOTE]
> The owner reads QA sheets and the campaign `00-index.md` in the Studio. Write them following
> [`skills/writing-for-markdown-okf-schema-studio/SKILL.md`](../../../../skills/writing-for-markdown-okf-schema-studio/SKILL.md),
> kept modest: one alert at most, tables, the Currently / Expected images.

> [!TIP]
> A campaign hunts for bad behaviours that no test and no requirement covers yet. A **Gap** is the
> main target, not a weaker bug. Search `requirements/` (okfreq or grep) only to tell a Gap from a
> **Decision**; never skip a finding because nothing specifies it.

## Full form (High and Medium)

````markdown
# Tab through a wide table leaves the cell editor outside the visible preview

Severity Medium · Reproduced · Verdict Gap · Requirements: none found · Area Tables · Side preview ·
QA210-06 · Replay `scenarios/c5-1-wide-table-tab-editor-offscreen.json`

## Currently / Expected

| Currently | Expected |
| --- | --- |
| ![currently](../evidence/QA210-06-currently.jpg) | ![expected](../evidence/QA210-06-expected.jpg) |
| After 9 Tabs the editor sits at x=1859 in a 393 px pane. | The table scrolls so the edited cell stays in view (source: spreadsheet convention, and the first column already works). |

The Currently shot is the before-shot the fix PR must reproduce.

## Why this is wrong

3 to 6 lines. What the author was trying to do and what the behaviour costs them (lost work,
wrong result, lost context, extra steps, confusion). Which expectation it breaks and where that
expectation comes from: a requirement, an invariant, an in-product case that works, a named
convention (VS Code, Obsidian, spreadsheet) or plain user logic. Why a reasonable author would not
accept it. A reader who does not know the code must be able to agree or disagree from this section
alone.

## Steps to reproduce

1. Fixture `synth/<file>.md` (its text below if it is not in `assets/synth/`).
2. Exact actions and keys, one per step.

## Impact

Consequence for the author, in one or two lines.

## Where it comes from

`src/…/file.ts` around line N, at the tested commit. Code reading comes after the observation.

## Suggested direction

A direction, not a patch.

Uncheck to disagree: [x]

## Test to add

Example, from another finding: real-input E2E: edit mode on, click a link-card header and a
link-only paragraph, assert a block editor is open and the active file is unchanged;
Cmd/Ctrl-click still navigates.

Uncheck to disagree: [x]

## Requirement to write or change

The SwRS to write or change (title and one EARS sentence), or the ID to amend. Only when the
behaviour is worth pinning (see "Proposals and balance").

Uncheck to disagree: [x]

## Promote replay to E2E

Only when proposed: why this replay should become a product E2E test.

Uncheck to disagree: [x]

## Done when

- [ ] An observable acceptance criterion.
- [ ] The replay scenario passes.
````

## Proposals and balance

The sections **Suggested direction**, **Test to add**, **Requirement to write or change** and
**Promote replay to E2E** are the author's proposals. Each ends with its own line
`Uncheck to disagree: [x]`, ticked by default, unless it offers several approaches (a radio group,
see below). The owner unticks what they disagree with; the fix CR carries out only the sections
still ticked. Triage copies the sheet as is: the "Test to add" and "Done when" text is a proposal,
not an order.

- When no test is proposed, the section says `No test: <reason>` followed by the same ticked line;
  unticking it means "add one anyway":

  ```markdown
  ## Test to add

  No test: cosmetic spacing, the replay scenario already catches a regression.

  Uncheck to disagree: [x]
  ```

- **Several approaches: a radio group.** When a proposal section offers two or three approaches,
  it lists them as a radio group, the recommended one preselected `(x)`, and keeps no
  `Uncheck to disagree` line: the owner picks another approach with one click in the Studio. A
  section with a single proposal keeps `Uncheck to disagree: [x]`.

  ```markdown
  ## Suggested direction

  - (x) A click in the margin around the block opens its editor
  - ( ) Alt+click on the link opens the editor
  - ( ) Leave as is: edit link-only blocks in the source
  ```

- **Reading a ticket.** An agent that carries out a sheet checks that each radio group has exactly
  one `(x)` and follows that option. With no `(x)`, or more than one, it does not guess: it asks
  the owner which approach to take.
- **Balance.** Propose a test only when the defect could come back silently and no existing test is
  close (data loss, buffer diff, regression of a fixed bug, invariant). Requirements follow the same
  rule. A cosmetic or one-off finding gets "No test: <reason>" and no new requirement.
- Omit "Promote replay to E2E" unless the replay is worth keeping as a product test.

## Short form (Low)

Keeps the title, the line under it, Currently / Expected and Why this is wrong. Steps, direction,
test and requirement fold into lines of their own, each with its tick, so the owner can accept
one and reject the other:

```markdown
**Steps.** Fixture and exact keys, in one or two lines.
**Fix.** Direction, with a file and line pointer if known. Uncheck to disagree: [x]
**Test.** The assertion to add, or "No test: <reason>". Uncheck to disagree: [x]
**Requirement.** For a Gap, the SwRS to write; else "none". Uncheck to disagree: [x]
```

## Verdict

| Verdict | When | At triage |
| --- | --- | --- |
| **Bug** | A requirement is violated, or an objective invariant breaks (buffer diff beyond the edited lines, data loss, error, element off-viewport, focus stuck), or the product contradicts itself (the same input works elsewhere). | Backlog item, carrying the requirement ID. |
| **Gap** | No requirement and no test covers this. | Backlog item; the sheet names the missing test (or says "No test: <reason>", see the balance rule); the fix CR writes the SwRS and the test, if the proposals stay ticked. |
| **Decision** | A requirement explicitly specifies the observed behaviour, but it looks wrong. | Never a bug: listed under "Decisions for the owner" in the index. |

An intent question is Low unless data is lost.

## Currently / Expected evidence rules

- **Currently**: a clipped JPEG of the symptom (`q shot NAME --clip preview`, or `--clip SELECTOR` /
  `--clip x,y,w,h` to frame just the broken part), mandatory whenever the symptom is visible. Name
  it `<id>-currently.jpg`.
- **Expected** names its source (a requirement ID, an invariant, an in-product working case, a
  convention) and is, by preference: (1) a shot of the working case in the same product (the same
  construct rendering correctly, for example a plain quote next to the broken alert); (2) the
  Currently shot annotated (outline plus a one-line note, see below); (3) for a buffer defect, two
  code blocks instead of images: today's diff and the expected diff. Name it `<id>-expected.jpg`.
- **No visual possible** (focus, timing, a value in the buffer): say why in one line under the
  table and give the measurements (numbers, diff, timings) in its place.
- At most two images per finding, about 1000 px wide, in `evidence/` next to the sheet.
- When the finding becomes a backlog item, its `01-intent.md` copies this block and links the
  archived images; the Currently shot is the before-shot the fix PR must reproduce.

## How to annotate

`q shot` draws the outlines itself, from selectors, so nothing is placed by eye. `--annotate` takes
a selector inside the preview or `x,y,w,h` in window CSS px; `--note` is its one-line label;
`--color` is `red` (the defect, default) or `green` (the expected or working case). The three repeat
and pair by position (the nth `--note` and `--color` go with the nth `--annotate`; one `--color`
applies to all; a `--note` without text is an error, and a count mismatch prints a warning).

```bash
q shot QA210-03-currently --clip preview \
  --annotate 'aside[data-okf-github-alert] ~ p' --note 'Defect: lazy line leaves the Note' \
  --color red \
  --annotate 'blockquote' --note 'Works: quote keeps it' --color green
```

The driver prints each resolved box (`annotate <target> -> x= y= w= h=`) so the caller can check it.
Labels are placed outside their outline when there is room (above, then below), else inside, taking
the first spot that stays inside the shot and touches no other outline or label (else above, with a
warning). A label can cover nearby text that is not annotated: open the shot, and shorten or drop
the note if it hides something that matters. When the shot has `--annotate`, a `--clip SELECTOR`
gets 34 px of padding instead of 12, so a label fits outside the outline. An empty box is an error;
a box outside the clip or the visible preview is a warning.
`--which N` picks the preview, as for `q box`.
It draws a temporary overlay in the workbench page just before the CDP shot and removes it right
after, so the shot's own clip and scale apply and there is no window to image pixel arithmetic;
nothing needs installing. In `q run` scripts and scenario shot steps pass `annotate` as a list of
selectors or `{ at, note, color }` objects.

## The line under the title

One plain line, in this order: `Severity <High|Medium|Low> · <Reproduced|Observed once|Code review>
· Verdict <Bug|Gap|Decision> · Requirements: <IDs or none found> · Area <area> · <Side preview|Open
With editor|Both> · <finding ID> · Replay scenarios/<file>.json`. At triage the coordinator appends
`· P1`, `· P2` or `· P3`.
