# Bug Sheet Templates

Full sheet for High and Medium findings; short sheet for Low findings and nits. Every sheet names
its replay scenario: the next campaign re-checks the finding by running it, not by exploring again.

## Full sheet

```markdown
# UX-NN — One-sentence, user-visible title

| Field | Value |
| --- | --- |
| Severity | High / Medium / Low (see the index scale) |
| Confidence | Reproduced / Observed / Observed once, not reproduced / Code review |
| Area | Inline editing, tables, frontmatter, OKF links, lifecycle, rendering, chrome, tests |
| Modes | Side preview / Open With editor / both |
| Evidence | [image.jpg](../evidence/image.jpg) and/or measured numbers |
| Related | Cross-references to other findings or to `deep-analysis-review` IDs |
| Replay | `scenarios/ux-NN-slug.json` (or "manual" with the reason) |

## Use case

Who is doing what, and why, in one or two sentences.

## Steps to reproduce

Numbered steps on a named fixture of the QA workspace, with the exact keys typed.

## Expected

What a user reasonably expects, with the convention it comes from (VS Code, Obsidian, spreadsheet).

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
Replay `scenarios/ux-NN-slug.json` · Evidence [image.jpg](../evidence/image.jpg)

**Steps.** Fixture and exact keys, in one to three lines.
**Expected / observed.** One line each.
**Direction.** One line; file and line pointer if known.
```
