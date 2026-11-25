---
title: Feature clip okf-frontmatter
status: draft
date: 2026-11-25
---

# Feature clip: okf-frontmatter

**This is the live storyboard.** The clip is built from this file: edit any row marked
*(on screen)*, save, and run `just clip okf-frontmatter render`, then `check`. Rows marked
*(filmed)* describe the take: changing them means a new take. The text of an *(on screen)* row is
the clip's exact text (`**bold**` takes the orange accent).

The clip is one continuous shot: a click on the `status` value, a new value typed and saved, then a
zoom on the frontmatter table and the page body. It shows two texts in turn. Its sibling
`okf-schema-bundle-frontmatter` films the same page in a schema bundle, with the same gesture,
marks and caption voice.

## Clip

| Field | Content |
| --- | --- |
| Length | 11.5 s |
| Size *(on screen)* | 1280x720 16:9 |
| Frame rate *(on screen)* | 15 fps |
| Outputs | silent, loops; MP4 (X, release), WebM (docs site), GIF 960 px (release notes, docs page) |
| Cards | none |
| Logo | top right |
| Setting filmed | none: every setting at its default (edit mode is a view choice, set off camera) |
| Filmed on | Windows, VS Code 1.147.0, extension 1.12.1 VSIX built from the branch |
| Stage | `stage/release-note.md` (Studio, the whole window, edit mode): standard frontmatter (`title`, `description`, `status: draft`, `date`, `tags`), no `type`, no `_schema/` folder; a heading, a "Status:" line with `= this.status`, one sentence |

## 1. Click the value, type, save

![The click on the draft value of the status row: the pointer and its ripple on the value, the Names and Values table above the page](frames/editing.png)

![The new value published typed in the text box of the status cell, before the save chord; the body line still reads draft](frames/01-selected.png)

![The box closed on the save chord: the status row and the "Status:" line of the page both read published, with the Ctrl+Enter / ⌘Enter badge](frames/02-pasted.png)

| Field | Content |
| --- | --- |
| Time | 0 to 6.2 s (click on the `status` value at 1.01 s: the text box opens; its text selected at 1.8 s; `published` typed from 2.2 s; save at 4.61 s; table and body updated by about 5.4 s) |
| Shot *(filmed)* | Studio in edit mode on `release-note.md`. The pointer clicks the `draft` value of the `status` row: a text box opens in the cell with `draft`. The text is selected and `published` typed over it. Save chord: the box closes, the row reads `published` and the body line reads "Status: published". |
| Text 1 *(on screen)* | Click a frontmatter value to **edit** it in place |
| Badge save *(on screen)* | Ctrl+Enter / ⌘Enter |

## 2. Zoom on the table and the page

![Zoom on the frontmatter table and the "Status:" line under the heading](frames/03-zoomed.png)

![Mark 1 on the status row](frames/04-mark-1.png)

![Mark 2 on the "Status: published" line](frames/05-mark-2.png)

| Field | Content |
| --- | --- |
| Time | 6.2 to 11.5 s (zoom from 6.22 s, held to 10.5 s, then back to the start for the loop) |
| Shot *(filmed)* | Zoom (at most 2x) on the frontmatter table and the "Status:" line under the heading: the two columns Names and Values, the five fields, `status` reading `published` in the table and in the page. |
| Zoom | table, hold to 10.5 s |
| Mark 1 *(on screen)* | Orange outline around the `status` row, 7.0 to 8.7 s |
| Mark 2 *(on screen)* | Orange outline around the "Status: published" line, 8.7 to 10.4 s |
| Text 2 *(on screen)* | The table and the page show the **new value** |

Expected result, the scenario's check: `release-note.md` on disk (auto-save is on) is exactly this
text, followed by one newline:

```markdown
---
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

In the preview, the `status` row's value reads `published` and the body's inline value reads
`published`.

## Review notes

- Behaviour relied on (origin/main): with no string `type` and no `_schema/` folder, Studio shows
  the generic table, columns Names and Values, keys in source order, no type icons, no Description
  column, no badge (SwRS FMSCHEMA-005, FMSCHEMA-006; `src/core/frontmatter/okfFrontmatter.ts`). A
  click on a value cell in edit mode opens its editor (FMEDIT-001); a string value without a schema
  opens a YAML text box where Enter adds a line and Ctrl/Cmd+Enter saves (FMEDIT-004;
  `src/page/features/frontmatterValueEditor.ts`). Inline code `= this.status` shows the field in the
  body (writing skill `references/examples.md`, `src/core/render/mystRenderer.ts`).
- The fields are the standard set the writing skill names (`title`, `description`, `status`,
  `date`) plus a `tags` list, to show a list as dash items.
- Off camera (`setup`): the toolbar is expanded, edit mode is on and the pointer is parked in the
  page's right margin, away from the table. Frame 0 shows the Names and Values table (keys in source
  order, `tags` as two dash items) and the body line "Status: draft".
- The old text is selected with Ctrl+A in the box and the new one typed with
  `t.page.keyboard.type`; only the save chord is a logged press, hence the one badge. The take
  selected with Ctrl+A (no fall back to `select()`).
- Without a schema a number, boolean or null value is not editable: the clip edits a string on
  purpose. The sibling clip shows the typed controls a schema brings.
- The text box opens under the click with the small "Add field / Remove field" menu below it; the
  pointer is parked back in the margin right after the click, so no tooltip shows. The menu does not
  cover the `status` row, but the box makes the row taller and pushes the lines below it down until
  the save (`frames/01-selected.png`).
- `frames/editing.png` is taken at the click (1.08 s): it shows the ripple on `draft`, the text box
  is drawn in the next frames.
- The status text "Saving frontmatter…" then "Saved. Refreshing preview…" did not show in the zoom nor
  in any key frame.
- Measured by the take: filmed 11.56 s played in 11.5 s (playback rate 1.005); click at 1.01 s, key
  frame `editing` at 1.08 s, save at 4.61 s, zoom from 6.22 s, mark 1 from 7.01 to 8.71 s, mark 2 from
  8.71 to 10.41 s, unzoom at 10.51 s. The raw screencast runs at about 3 frames per second
  (`rawFps` of `check.json`): the pointer is drawn smooth by the kit, the typing and the page change
  by steps.
- `01-selected` and `02-pasted` are the kit's fixed key frame names (here, just before and just
  after the save chord).
- The storyboard is reviewed in the pull request after the take (okf-fm-Q3). Not checked by the
  author: motion, rhythm, the loop as watched.

