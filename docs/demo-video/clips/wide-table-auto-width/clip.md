---
title: Feature clip wide-table-auto-width
status: draft
date: 2026-11-25
---

# Feature clip: wide-table-auto-width

**This is the live storyboard.** The clip is built from this file: edit any row marked
*(on screen)*, save, and run `just clip wide-table-auto-width render`, then `check`. Rows marked
*(filmed)* describe the footage of the take: changing them means a new take. `**bold**` in a text
takes the orange accent.

The clip is one continuous shot: the page in Margin with a very wide table cut at the column, one
click on the Width button, the same page in Auto with the table broken out of the column, then a
light zoom and two marks. It shows two texts in turn.

## Clip

| Field | Content |
| --- | --- |
| Length | 10.6 s |
| Size *(on screen)* | 1280x720 16:9 |
| Frame rate *(on screen)* | 15 fps |
| Outputs | silent, loops; MP4 (X, release), WebM (docs site), GIF 960 px (release notes, docs page) |
| Cards | none |
| Logo | top right |
| Setting filmed | none: every setting at its default (`preview.maxContentWidth` 960 px; the width mode is a view choice, set off camera to Margin) |
| Filmed on | Windows, VS Code 1.147.0, extension 1.12.1 VSIX built from the branch |
| Stage | `stage/deploys.md` (Studio, the whole window, reading mode, Cream theme): a heading, a paragraph of two lines, a table of 17 columns (service, team, region, tier, twelve months, total) and five rows, a closing sentence, all in view |

Off camera (`setup`): the toolbar expanded (a new workspace starts collapsed), reading mode, the
Cream theme and the closed TOC (the defaults); the Width button clicked until it reads "Width:
Margin", so frame 0 is Margin whatever the workspace stored. The button cycles Margin, Auto, Full
width.

## 1. Margin: the table is cut at the column

![The page in Margin: the heading and the paragraph in the centred column, the table of deploys cut after April at the column's right edge with the shaded edge and a sideways scrollbar, the pointer on the Width button](frames/margin.png)

| Field | Content |
| --- | --- |
| Time | 0 to 2.8 s (the pointer moves to the Width button from 0.3 s; click at 2.5 s) |
| Shot *(filmed)* | Studio on `deploys.md` in Margin. The heading and the paragraph sit in the centred column; the table starts at the column's left edge and is cut at its right edge after the first few months, with the shaded edge of a table that scrolls sideways. The pointer moves to the Width button, the first button of row 3, and clicks. |
| Text 1 *(on screen)* | In **Margin**, a wide table is cut at the column |

## 2. Auto: the table takes the width it needs

![The page in Auto after the click: the table broken out of the column on both sides, centred, with every month and the total, the heading and the paragraph where they were](frames/auto.png)

![Mark 1: an orange outline around the table, broken out of the column, in the light zoom](frames/04-mark-1.png)

![Mark 2: an orange outline around the paragraph, still in the narrow column, above the wider table](frames/05-mark-2.png)

| Field | Content |
| --- | --- |
| Time | 2.8 to 10.6 s (the pointer leaves the toolbar by 3.4 s; zoom from 3.8 s, held to 9.6 s, then back to the start for the loop) |
| Shot *(filmed)* | At the click the table breaks out of the column on both sides, centred on the pane, and shows all twelve months and the total with no sideways scroll; the heading, the paragraph and the closing sentence do not move. The pointer moves off the toolbar to the blank right of the heading. A light zoom (close to 1x: the table is almost as wide as the pane) on the paragraph and the table. |
| Zoom | page, hold to 9.6 s |
| Mark 1 *(on screen)* | Orange outline around the table, broken out of the column, 4.4 to 6.6 s |
| Mark 2 *(on screen)* | Orange outline around the paragraph, still in the narrow column, 6.8 to 9.0 s |
| Text 2 *(on screen)* | In **Auto**, the table breaks out; the text keeps its column |

Expected result, the scenario's check (visible state, read from the preview; the file is never
changed):

- At frame 0 the page's width mode is Margin (`data-sphinx-preview-width="margin"`, the button's
  title "Width: Margin"); the table is no wider than the column and overflows it: its `scrollWidth`
  is larger than its `clientWidth`, and it carries `data-sphinx-table-overflow="true"`.
- After the click the width mode is Auto (title "Width: Auto"); the table's top-level block carries
  `data-sphinx-preview-wide`, its box is wider than the paragraph's box on both sides, its centre is
  within 2 px of the centre of the page's client width
  (`document.documentElement.clientWidth / 2`), and it no longer overflows (`scrollWidth` at most
  `clientWidth` plus 1).
- The paragraph's left edge and width are the same before and after the click.
- `deploys.md` on disk is byte for byte `stage/deploys.md`.

## Review notes

- Which tables break out (`src/page/modules/widthMode.ts`, `docs/user/wide-tables.md`): in Auto a
  table breaks out only when the sum of its column minimums is wider than the column. A token
  column (every body cell at most three words: a name, a number) counts at its natural width and
  never wraps; a prose column counts about 24 characters. Every column of this table is a token
  column, so its minimum is its natural width.
- The sizes, measured by the take (extension 1.12.1 VSIX, VS Code 1.147.0, the page's client width
  1147 CSS px): the column is 804 CSS px (960 px minus two gutters of 78 px, `maxContentWidth` 960);
  the room in Auto is the client width minus 32 px, 1115 CSS px. In Margin the table's `clientWidth`
  is 804 and its `scrollWidth` 1595: it shows Service to April (four months) and scrolls sideways. In
  Auto the table block is 940 CSS px wide, from x 103.5 to 1043.5 (centre 573.5, the page's centre
  573.5), its `scrollWidth` and `clientWidth` are both 940: inside the band, wider than the column,
  narrower than the room. The stage table was kept as designed, with its Total column: no change to
  the table, so the CR `clip-adapt-the-export-video-long-page-sa` can take its first 16 columns as
  they are.
- A table wider than the room would break out to the room and still scroll: that is why the table
  is not wider.
- The expanded toolbar's three rows sit right of the heading and end above the table (in Auto, the
  toolbar's bottom edge is about 20 px above the table's top edge): they cover neither the table's
  right end nor the Width button's neighbours, in Auto and in the zoom (`frames/auto.png`,
  `frames/03-zoomed.png`).
- The width change has no animation: the table jumps at the click, between two screencast frames
  (the take's raw rate is 4.2 fps, retimed to 15 fps). The jump reads as a cut; the loop as watched
  is not judged here.
- The zoom is almost 1x. It is there because the kit shows a mark only during a zoom.
- The pointer leaves the Width button after the click, so its tooltip ("Width: Auto") is not in the
  zoom. In `frames/margin.png`, taken just before the click, the tooltip "Width: Margin" is shown
  next to the pointer: it is part of the Margin beat and is gone at frame 0 and at the seam.
- The loop seam: the one-click version was rendered (the clip ends in Auto and starts in Margin,
  the kit's return to the start joins them) and its seam SSIM is 0.99137 (limit 0.98): the fallback
  of two more clicks was not needed.
- The table style (service, team, region, tier, months) is the one of the wide table of the CR
  `clip-adapt-the-export-video-long-page-sa`, for consistency between the two clips; this clip adds
  a Total column.
- Key frames: `margin` (`frames/margin.png`, before the click), `auto` (`frames/auto.png`, after the
  pointer left the toolbar), and the kit's `03-zoomed`, `04-mark-1` and `05-mark-2`. Not checked by
  the author: motion, rhythm, the loop as watched.
