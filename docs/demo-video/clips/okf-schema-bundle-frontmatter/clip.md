---
title: Feature clip okf-schema-bundle-frontmatter
status: draft
date: 2026-11-25
---

# Feature clip: okf-schema-bundle-frontmatter

**This is the live storyboard.** The clip is built from this file: edit any row marked
*(on screen)*, save, and run `just clip okf-schema-bundle-frontmatter render`, then `check`. Rows
marked *(filmed)* describe the take: changing them means a new take. The text of an *(on screen)*
row is the clip's exact text (`**bold**` takes the orange accent).

The clip is one continuous shot: the invalid `status` value and the title badge ✖ 1, a click on the value, a value picked in
the typed control and saved, then a zoom on the schema table and the page body. It shows two texts
in turn. It is the sibling of `okf-frontmatter`: the same page, the same `status` field, the same
click, save chord and marks. Only `type: note` and the `_schema/` folder are added.

## Clip

| Field | Content |
| --- | --- |
| Length | 12 s |
| Size *(on screen)* | 1280x720 16:9 |
| Frame rate *(on screen)* | 15 fps |
| Outputs | silent, loops; MP4 (X, release), WebM (docs site), GIF 960 px (release notes, docs page) |
| Cards | none |
| Logo | top right |
| Setting filmed | none (edit mode is the scenario's `checks.editMode: "on"`) |
| Filmed on | Windows, VS Code 1.147.0, extension 1.12.1 VSIX built from the branch |
| Stage | a real OKF Schema bundle: `stage/_schema/note.schema.yaml` and `stage/notes/release-note.md` (Studio, the whole window, edit mode). The page is the sibling's page plus `type: note`, with the typo `status: publshed` |

Off camera (`setup`): the toolbar expanded, edit mode on, the pointer parked away from the table.
Frame 0 shows the schema table (Name, Value, Description; a type icon per field), the `status` row
carrying one error with the title badge reading ✖ 1 (the error signal Studio paints today: the field row has no colour of its own), and the body line "Status: publshed".

## 1. Pick a valid value, save

![Frame 0 of the take in the sibling's frames](frames/01-selected.png)

![The table after the save](frames/02-pasted.png)

![The zoom on the table](frames/03-zoomed.png)

![The schema table at frame 0: the invalid value publshed on the status row, the title badge reading 1 error](frames/invalid.png)

![The select open in the status cell, on Choose a value...](frames/select-open.png)

![The value published picked, before the save](frames/picked.png)

| Field | Content |
| --- | --- |
| Time | 0 to 6.6 s (click on the `status` value at 1.2 s: the select opens in the cell on "Choose a value..."; ArrowDown at 2.2 s and 2.7 s: `draft`, then `published`; save at 4.8 s; table and body updated by about 5.6 s) |
| Shot *(filmed)* | Studio in edit mode on `notes/release-note.md`. The `status` row carries one error and the title badge reads ✖ 1. The pointer clicks the `publshed` value: a select with the schema's values opens in the cell, on "Choose a value...". Two ArrowDown keys reach `published`. Save chord: the select closes, the title badge goes away, and the body line reads "Status: published". |
| Text 1 *(on screen)* | The schema **types** each field: pick a valid value |
| Badge save *(on screen)* | Ctrl+Enter / ⌘Enter |

## 2. Zoom on the table and the page

![Mark 1 around the status row](frames/04-mark-1.png)

![Mark 2 around the Status line of the page](frames/05-mark-2.png)

| Field | Content |
| --- | --- |
| Time | 6.6 to 12.0 s (zoom from 6.9 s, held to 11.0 s, then back to the start for the loop) |
| Shot *(filmed)* | Zoom (at most 2x) on the schema table and the "Status:" line: the type icons (text, enum, date, list), the Description column ("Where the note stands."), `status` reading `published` with no error, and the same value in the page. |
| Zoom | table, hold to 11.0 s |
| Mark 1 *(on screen)* | Orange outline around the `status` row, 7.4 to 9.1 s |
| Mark 2 *(on screen)* | Orange outline around the "Status: published" line, 9.1 to 10.8 s |
| Text 2 *(on screen)* | Studio **validates** the value: the error is gone |

Expected result, the scenario's check: `notes/release-note.md` on disk (auto-save is on) is exactly
this text, followed by one newline (the stage with the one line `status: publshed` changed to
`status: published`); `_schema/note.schema.yaml` is unchanged. Before the edit, the table is the
schema table (`data-okf-schema-found`), the `status` row carries one error and the badge reads
✖ 1. After the save, no row carries an issue, the badge is gone, and the body's inline value reads
`published`.

```markdown
---
type: note
title: Release 2.4
description: What ships in the spring release.
status: published
date: 2026-11-25
tags:
  - release
  - spring
---

# Release 2.4

**Status:** `= this.status`

The spring release brings faster search and a new export menu.
```

## Review notes

- Deviation, ruled by the Chief of Staff (Q11): the storyboard first said the `status` row is red at
  frame 0. Studio paints no colour on a field row in error (`okf-error` has a style only on the
  info row, `src/core/preview/styles/propertiesStyles.ts`); the error signal on screen is the title
  badge ✖ 1. The clip shows what exists, so every "red row" is reworded. The
  missing row style is filed apart as a possible bug.
- The stage is a real bundle by Studio's rule (SwRS FMSCHEMA-019,
  `src/core/frontmatter/okfFrontmatter.ts`): Studio walks up from `notes/` to the nearest
  `_schema/` folder and matches the string `type` to `note.schema.yaml` (case ignored). The schema
  follows the shape of `docs/demo-video/short-demo-01/stage/_schema/post-mortem.schema.yaml`. There
  is no lookup in Restricted Mode; the kit's profile turns workspace trust off, so the lookup runs.
- Behaviour relied on: the schema table with Name, Value, Description, fields in schema order and a
  type icon (FMSCHEMA-029); ajv validation, the error on the row and the title badge "Go to the first frontmatter issue" (FMSCHEMA-084,
  FMSCHEMA-039; `src/core/frontmatter/frontmatterValidate.ts`); an enum value opens a select whose
  first entry "Choose a value..." is chosen when the current value is not allowed, and a pick alone
  does not save (FMEDIT-003, `src/page/features/frontmatterValueEditor.ts`). Enter, also with Ctrl
  or Cmd, saves a select, so the save chord is the sibling's.
- What differs from the sibling, all on screen: the Description column and type icons, the title badge
  at frame 0 (the row itself is not coloured), the select in place of the text box. What is the same: the page, the five
  standard fields, the `status` field, the click, the save badge, the two marks and their places.
- Measured by the take: no select popup showed, Escape was not needed, and the Description column
  stayed at 1280x720.
- Risk: a native select popup may not appear in the kit's screencast. The clip changes the value
  with ArrowDown on the closed select, which changes it in place on Windows without opening the
  popup. If the click opens the popup, the scenario presses Escape before the ArrowDown keys
  (bundle-fm-Q8).
- The row tooltip (title, description, "Allowed: draft, published, retired") shows on hover only;
  the clip does not hover the row, so it does not cover the zoom.
- The Description column collapses on a narrow preview; the whole window at 1280x720 should keep
  it. The trial take confirms it.
- The clip stays at 12 s, so it needs no longer kit limit and no `depends.json`.
- Off camera (`setup`): the toolbar expanded, edit mode on, the pointer parked away from the table.
- The pointer is parked back in the page's right margin right after the click: the row's tooltip
  and the hover would otherwise show.
- The storyboard is reviewed in the pull request after the take (bundle-fm-Q3). Not checked by the
  author: motion, rhythm, the loop as watched.
