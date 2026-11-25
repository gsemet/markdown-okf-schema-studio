---
title: Feature clip slash-menu-grid
status: draft
date: 2026-11-25
---

# Feature clip: slash-menu-grid

**This is the live storyboard.** The clip is built from this file: edit any row marked
*(on screen)*, save, and run `just clip slash-menu-grid render`, then `check`. Rows marked
*(filmed)* describe the take: changing them means a new take. The text of an *(on screen)* row is
the clip's exact text (`**bold**` takes the orange accent).

The clip is one continuous shot: the typed command and the menu, then a zoom on the rendered grid.
It shows two texts in turn.

## Clip

| Field | Content |
| --- | --- |
| Length | 11.5 s |
| Size *(on screen)* | 1280x720 16:9 |
| Frame rate *(on screen)* | 15 fps |
| Outputs | silent, loops; MP4 (X, release), WebM (docs site), GIF 960 px (release notes, docs page) |
| Cards | none |
| Logo | top right |
| Setting filmed | `markdownOkfSchemaStudio.editing.defaultPaletteMode`: `myst` (Grid is a MyST command; the default GFM mode does not list it) |
| Filmed on | Windows, VS Code 1.147.0, extension 1.12.1 VSIX built from the branch |
| Stage | `stage/onboarding.md` (Studio, the whole window, edit mode): a heading and one paragraph |

## 1. Type /grid, pick Grid

![The slash menu at the caret after /grid is typed: Grid highlighted, Table under it](frames/slash-menu.png)

![The Insert grid form with its defaults: Columns 2, Gutter 2, Cards 2](frames/grid-form.png)

![The {grid} text in the box, "Card 1" selected](frames/01-selected.png)

![The box closing on the save chord: two cards in the page](frames/02-pasted.png)

| Field | Content |
| --- | --- |
| Time | 0 to 6.2 s (click at the end of the paragraph at 0.82 s, two Enter at 1.6 s, `/grid` typed from 2.0 s with the menu shown by 2.94 s, Enter at 3.4 s with the form shown by 3.68 s, Enter in the form at 4.6 s, save at 5.80 s) |
| Shot *(filmed)* | Studio in edit mode on `onboarding.md`. The pointer clicks at the end of the paragraph: its text box opens with the edition palette. Two Enter make an empty line; `/grid` is typed: the slash menu opens at the caret, Grid (MyST) highlighted first, Table under it. Enter: the "Insert grid" form opens (Columns 2, Gutter 2, Cards 2). Enter: the `{grid}` text is written in the box, "Card 1" selected. Save chord: the box closes and the page renders a grid of two cards. |
| Text 1 *(on screen)* | Type **/grid** in a block to insert a card grid |
| Badge save *(on screen)* | Ctrl+Enter / ⌘Enter |

## 2. Zoom on the grid

![Zoom on the paragraph and the two cards](frames/03-zoomed.png)

![Mark 1 on the two cards](frames/04-mark-1.png)

| Field | Content |
| --- | --- |
| Time | 6.2 to 11.5 s (zoom from 6.56 s, held to 10.5 s, then back to the start for the loop) |
| Shot *(filmed)* | Zoom (at most 2x) on the paragraph and the two rendered cards, "Card 1" and "Card 2", side by side. |
| Zoom | grid, hold to 10.5 s |
| Mark 1 *(on screen)* | Orange outline around the two cards, 7.0 to 8.8 s |
| Text 2 *(on screen)* | A MyST **card grid**, rendered in place |

Expected result, the scenario's check: `onboarding.md` on disk (auto-save is on) is exactly this
text, followed by one newline:

```markdown
# Onboarding

Welcome to the team. Pick the track that fits your first week.

::::{grid} 2
:gutter: 2

:::{grid-item-card} Card 1

Content
:::

:::{grid-item-card} Card 2

Content
:::
::::
```

## Review notes

- The cards keep their placeholder titles "Card 1", "Card 2" and body "Content": typing a real title
  over the selected "Card 1" would add 2 s or more. The owner may ask for it at the review.
- The clip ends with the grid and starts without it: the loop seam relies on the kit's return to the
  start.
- Grid ranks first for `/grid` in MyST mode, and Table second (its alias "grid"); the take checks
  the highlighted entry before Enter.
- Only the save chord has a keycap badge. The two Enter, `/grid` and the form's Enter are typed and
  show in the box.
- `01-selected` and `02-pasted` are the kit's fixed key frame names (here, just before and just
  after the save chord).
- With the default GFM mode, `/grid` lists only Table and opens its size grid. That case is not
  filmed.
- The pointer is parked back in the page's right margin right after the click: the palette opens
  under the click point and its button tooltip would otherwise show.
- The tab shows its unsaved dot in `frames/slash-menu.png` (while `/grid` is typed) and not in the
  other pictures.
- Measured by the take: filmed 11.55 s played in 11.5 s (playback rate 1.004); click at 0.82 s, key
  frame `slash-menu` at 2.94 s and `grid-form` at 3.68 s, save at 5.80 s, zoom from 6.56 s, mark 1
  from 7.01 to 8.81 s, unzoom at 10.50 s. The raw screencast runs at about 4.9 frames per second
  (`rawFps` of `check.json`): the pointer is drawn smooth by the kit, the typing and the page change
  by steps.
- The storyboard is reviewed in the pull request after the take (clip-slash-grid-Q3). Not checked by
  the author: motion, rhythm, the loop as watched.
