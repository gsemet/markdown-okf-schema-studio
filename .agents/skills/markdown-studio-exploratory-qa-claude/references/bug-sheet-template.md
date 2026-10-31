# Bug Sheet Templates

Full sheet for High and Medium findings; short sheet for Low findings and nits. Every sheet names
its replay scenario: the next campaign re-checks the finding by running it, not by exploring again.

> [!NOTE]
> The owner reads QA sheets and the campaign `00-index.md` in the Studio. Write them following
> [`skills/writing-for-markdown-okf-schema-studio/SKILL.md`](../../../../skills/writing-for-markdown-okf-schema-studio/SKILL.md):
> alerts, tables and the Currently / Expected images; nothing heavier.

## Currently / Expected evidence rules

Every full sheet and every short sheet whose symptom is visible starts with the Currently /
Expected block of the templates below.

- **Currently** (mandatory when the symptom is visible): a clipped JPEG of the symptom, taken
  with `q shot NAME --clip preview` (or `--clip SELECTOR` / `--clip x,y,w,h` to frame just the
  broken part). Name it `<id>-currently.jpg`.
- **Expected**, by preference: (1) a shot of the working case in the same product (the same
  construct rendering correctly, for example a plain quote next to the broken alert); (2) the same
  shot annotated with an outline or arrow and a one-line note of what should be there; (3) for a
  buffer defect, two code blocks instead of images: today's diff and the expected diff. Name it
  `<id>-expected.jpg`.
- **No visual possible** (focus, timing, a value in the buffer): say why in one line under the
  table and give the measurements (numbers, diff, timings) in its place.
- The block's images replace the old single evidence image: two JPEGs per finding at most.
- When the finding becomes a backlog item, its `01-intent.md` copies this block and links the
  archived images; the Currently shot is the before-shot the fix PR must reproduce.

## Full sheet

```markdown
# UX-NN — One-sentence, user-visible title

| Field | Value |
| --- | --- |
| Severity | High / Medium / Low (see the index scale) |
| Confidence | Reproduced / Observed / Observed once, not reproduced / Code review |
| Area | Inline editing, tables, frontmatter, OKF links, lifecycle, rendering, chrome, tests |
| Modes | Side preview / Open With editor / both |
| Evidence | Currently and Expected images below (paths in the reference definitions at the end) |
| Related | Cross-references to other findings or to `deep-analysis-review` IDs |
| Replay | `scenarios/ux-NN-slug.json` (or "manual" with the reason) |

## Currently / Expected

First thing after the table, before the steps. A two-column table, one image (or diff) per side,
one caption line each. The images are the only evidence files of the finding (JPEG, clipped to
about 1000 px wide).

| Currently | Expected |
| --- | --- |
| ![Currently][cur] | ![Expected][exp] |
| One line: what the screen shows today. | One line: what it should show. |

[cur]: ../evidence/ID-currently.jpg
[exp]: ../evidence/ID-expected.jpg

## Use case

Who is doing what, and why, in one or two sentences.

## Steps to reproduce

Numbered steps on a named fixture of the QA workspace, with the exact keys typed.

## Expected

In words, what a user reasonably expects, with the convention it comes from (VS Code, Obsidian,
spreadsheet).

## Observed

What happened, with the buffer diff or measurements when relevant.

## Impact

Consequence for the author (data loss, noisy diff, lost context, friction).

## Where it comes from

File and line pointers at the tested commit. Code reading comes after the visible observation.

## Suggested direction

A direction, not a patch.

## Test to add

The unit or real-input E2E assertion that would have caught it.

## Done when

An observable acceptance criterion.
```

## Short sheet

```markdown
# UX-NN — One-sentence, user-visible title

Severity Low · Confidence Reproduced · Area Tables · Modes side preview ·
Replay `scenarios/ux-NN-slug.json`

| Currently | Expected |
| --- | --- |
| ![Currently][cur] | ![Expected][exp] |
| One line. | One line. |

[cur]: ../evidence/ID-currently.jpg
[exp]: ../evidence/ID-expected.jpg

**Steps.** Fixture and exact keys, in one to three lines.
**Expected / observed.** One line each.
**Direction.** One line; file and line pointer if known.
```
