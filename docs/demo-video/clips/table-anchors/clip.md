---
title: Feature clip table-anchors
status: draft
date: 2026-11-25
---

# Feature clip: table-anchors

**This is the live storyboard.** The clip is built from this file: edit any row marked
*(on screen)*, save, and run `just clip table-anchors render`, then `check`. Rows marked
*(filmed)* describe the footage of the take: changing them means a new take. `**bold**` in a text
takes the orange accent.

The clip is one continuous shot: a row dragged by its handle, then a column dragged by its handle,
in the page on the left, then a zoom on the raw text on the right. It shows two texts in turn.

## Clip

| Field | Content |
| --- | --- |
| Length | 12.0 s |
| Size *(on screen)* | 1280x720 16:9 |
| Frame rate *(on screen)* | 15 fps |
| Outputs | silent, loops; MP4 (X, release), WebM (docs site), GIF 960 px (release notes, docs page) |
| Cards | none |
| Logo | top right |
| Setting filmed | none: every setting at its default |
| Filmed on | Windows, VS Code 1.147.0, extension 1.12.1 VSIX built from the branch |
| Stage | `stage/launch-checklist.md` opened twice: in Studio (left, edit mode) and in the built-in text editor (right). A pipe table of 3 columns (Task, Team, Due), a header and 4 body rows, its cells padded to the column width |

## 1. Drag a row, then a column, by its handle

![The row "Fix the login bug" dragged by its handle above "Write the notes": the drop line shows where it lands](frames/row-drag.png)

![The row at the top of the table, in the page and in the raw text](frames/row-dropped.png)

![The column "Due" dragged by its handle left of "Task": the drop line shows where it lands](frames/column-drag.png)

![The column "Due" first, in the page and in the raw text](frames/column-dropped.png)

| Field | Content |
| --- | --- |
| Time | 0 to 7.0 s (row: pointer on the handle of "Fix the login bug" at 0.9 s, press at 1.26 s, drag 1.26 to 2.4 s with the drop line shown, drop at 2.5 s, the page and the raw text show the new row order by 3.5 s; column: pointer on the handle above "Due" at 4.2 s, press at 4.56 s, drag 4.56 to 5.7 s with the drop line shown, drop at 5.8 s, the new column order by 6.8 s) |
| Shot *(filmed)* | Studio in edit mode on `launch-checklist.md` (left), the same file as raw text (right). The pointer moves to the handle left of the third body row, "Fix the login bug" (title "Drag to move row (Alt+Up, Alt+Down)"), presses and drags it up onto the upper half of the first body row, "Write the notes", then drops. The row is dimmed while it is dragged and a line above "Write the notes" shows where it lands. The table shows Fix the login bug, Write the notes, Build the packages, Publish the release; the raw text on the right changes to the same order. The pointer then moves to the handle above the "Due" column (title "Drag to move column (Alt+Left, Alt+Right)"), presses and drags it left onto the left half of the "Task" header cell, then drops. The column is dimmed while it is dragged and a line on the left of "Task" shows where it lands. The table reads Due, Task, Team; every line of the raw text changes to the same column order. |
| Text 1 *(on screen)* | Drag a row or a column by its **handle** |

## 2. Zoom on the raw text

![Mark 1 on the moved row in the raw text](frames/04-mark-1.png)

![Mark 2 on the moved column in the raw text](frames/05-mark-2.png)

| Field | Content |
| --- | --- |
| Time | 7.0 to 12.0 s (zoom from 7.1 s, held to 11.2 s, then back to the start for the loop) |
| Shot *(filmed)* | Zoom (at most 2x) on the table in the text editor (right), the heading in view. |
| Zoom | raw, hold to 11.2 s |
| Mark 1 *(on screen)* | Orange outline around the whole line of the moved row (Today, Fix the login bug, QA), 7.6 to 9.1 s |
| Mark 2 *(on screen)* | Orange outline around the first cell of every table line, the "Due" column (header, delimiter and the 4 body rows), 9.1 to 10.6 s |
| Text 2 *(on screen)* | The **raw table** follows, each cell keeps its spacing |

Expected result, the scenario's check: `launch-checklist.md` on disk (auto-save is on) is exactly
this text:

```markdown
# Launch checklist

| Due   | Task                | Team  |
| ----- | ------------------- | ----- |
| Today | Fix the login bug   | QA    |
| Mon   | Write the notes     | Docs  |
| Tue   | Build the packages  | Build |
| Wed   | Publish the release | Docs  |
```

## Review notes

- The owner's word is "anchors"; Studio's UI and docs say "handle" ("Move table row", "Move table
  column"), and "anchor" already names other things in Studio (the anchor icon of a `(label)=`
  target, the Anchor button of the toolbar). The captions say "handle".
- The handles use HTML drag and drop (`draggable`, `dragstart`, `dragover`, `drop`); the kit's
  mouse goes through CDP into the preview webview. A CDP drag shows no floating copy: the dragged
  row or column is dimmed in place and a line shows where it lands.
- Each move is one edit of the whole table, one undo. A moved column keeps each cell's text and
  padding as written, so the padded raw table stays aligned.
- The second drag starts after the render of the first (until then the handles refuse a drag).
  After each move the moved row's or column's handle takes the focus: a focus outline may show on
  it, which is the real behaviour.
- Opening the same file in the text editor beside Studio is done off camera; both show one file, so
  the raw text updates as soon as the page writes.
- The raw screencast runs at about 3.0 frames per second: the pointer is drawn
  smooth by the kit, but the drop line and the page change by steps.
- The clip ends with the new order and starts with the old one: the loop seam relies on the kit's
  return to the start.
- Measured by the trial take, which is the take: filmed 12.05 s played in 12.0 s (playback rate
  1.004); presses at 1.22 s (row) and 4.52 s (column); key frame `row-drag` at 2.42 s,
  `row-dropped` at 3.51 s, `column-drag` at 5.72 s and `column-dropped` at 6.81 s; zoom from
  7.11 s; mark 1 from 7.60 to 9.11 s and mark 2 from 9.11 to 10.61 s; the pointer is back at its
  start before 12.0 s. Key frames: `frames/row-drag.png` (the row dimmed in place, the line before
  "Write the notes"), `frames/row-dropped.png`, `frames/column-drag.png` (the Due column dimmed, the
  line left of "Task"), `frames/column-dropped.png`, `frames/04-mark-1.png`,
  `frames/05-mark-2.png`. Not checked by the author: motion, rhythm, the loop as watched.
