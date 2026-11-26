---
title: Feature clip paste-spreadsheet-cells
status: draft
date: 2026-11-25
---

# Feature clip: paste-spreadsheet-cells

**This is the live storyboard, draft for the maintainer's review.** The clip is built from this
file: edit any row marked *(on screen)*, save, and run `just clip paste-spreadsheet-cells render`,
then `check`. Rows marked *(filmed)* describe the take: changing them means a new take. The clip is
one continuous shot, the copy on the right, the paste on the left, then a zoom on the table, with
two texts in turn; `**bold**` in a text takes the orange accent.

The spreadsheet is `tasks.tsv` in VS Code's text editor: the kit films the VS Code window only, so
a spreadsheet application cannot be in the shot. A copy from a spreadsheet puts the same
tab-separated text on the clipboard, which is what the table cell reads.

## Clip

| Field | Content |
| --- | --- |
| Length | 10.0 s |
| Size *(on screen)* | 1280x720 16:9 |
| Frame rate *(on screen)* | 15 fps |
| Outputs | silent, loops; MP4 (X, release), WebM (docs site), GIF 960 px (release notes, docs page) |
| Cards | none |
| Logo | top right |
| Setting filmed | none of Studio; for the TSV to read as columns, `editor.tabSize` 22, `editor.detectIndentation` off and `editor.renderWhitespace` none in the clip's profile |
| Filmed on | Windows, VS Code 1.147.0, extension 1.12.1 VSIX built from the branch |
| Stage | `stage/release-checklist.md` (Studio, left, edit mode: a table of 2 columns, a header and 1 row) and `stage/tasks.tsv` (text editor, right: 5 lines of 3 tab-separated values, a header included) |

## 1. Copy the cells, paste into the table

![The five lines of tasks.tsv selected in the text editor, before the copy](frames/01-selected.png)

![The table right after the paste: the four task rows are in place (the third column is still off the edge of the pane)](frames/02-pasted.png)

| Field | Content |
| --- | --- |
| Time | 0 to 4.7 s (drag 0.3 to 1.8 s, copy at 2.0 s, click on the cell "Task" at 3.2 s, paste at 3.8 s) |
| Shot *(filmed)* | Studio on `release-checklist.md` (left), `tasks.tsv` (right). The mouse drags over the five lines of `tasks.tsv`. Copy chord. The pointer moves to the table and clicks its header cell "Task": the cell editor opens. Paste chord. The table grows to 3 columns ("Due" added) and 5 lines (3 rows added). The take waits for the cell editor until 4.4 s; if it is open, a click on Done closes it, at 4.4 s, or up to about 0.3 s later (the pointer's move to the button) when the editor appears late. |
| Text 1 *(on screen)* | Copy cells from a sheet, **paste** into a table |
| Badge copy *(on screen)* | Ctrl+C / ⌘C |
| Badge paste *(on screen)* | Ctrl+V / ⌘V |

## 2. Zoom on the table

![Zoom on the table](frames/03-zoomed.png)

![Mark 1 on the added column "Due"](frames/04-mark-1.png)

![Mark 2 on the three added rows](frames/05-mark-2.png)

| Field | Content |
| --- | --- |
| Time | 4.7 to 10.0 s (zoom from 4.8 s, held to 9.2 s, then back to the start for the loop) |
| Shot *(filmed)* | Zoom (at most 2x) on the rendered table in Studio: Task, Owner, Due; four task rows. |
| Zoom | table, hold to 9.2 s |
| Mark 1 *(on screen)* | Orange outline around the added column "Due", 5.4 to 6.9 s |
| Mark 2 *(on screen)* | Orange outline around the three added rows, 6.9 to 8.4 s |
| Text 2 *(on screen)* | Cells fill right and down, **rows and columns** added |

Expected paste, the scenario's check: `release-checklist.md` on disk after the paste (auto-save is
on) is exactly this text:

```markdown
# Release 2.4 checklist

| Task | Owner | Due |
| --- | --- | --- |
| Freeze the branch | Ana | Mon |
| Run the migrations | Ben | Tue |
| Restart the workers | Chen | Wed |
| Announce the release | Dev | Thu |
```

## Review notes

- VS Code's copy also puts `text/html` on the clipboard; the cell editor reads `text/plain` (a text
  with a tab is a grid paste), so the HTML is ignored.
- The drag covers the five whole lines; the last line break is not selected (a final line break
  would be dropped anyway). A partial first or last line would paste a partial cell.
- The paste goes from the clicked cell: clicking the header cell "Task" makes the header and the
  existing row take the same values again; only "Due" and the three rows are new, which the marks
  show.
- The cell editor reopens in "Task" after the paste (the real-input integration test covers it).
  The first takes of this clip found it closed; that miss did not reproduce in runs on a branch
  whose product code (`src/`, `sphinx/`) is identical to that of commit `3478f09`. The clip makes
  no claim about it: the take waits for the editor until 4.4 s, and when it is open a click on Done
  closes it before the zoom, because an open editor widens the first column and hides "Due".
- The clip ends with the larger table and starts with the small one: the loop seam is the kit's
  cross-fade back to the first frame.
- The raw screencast runs at about 7.3 frames per second: the selection grows
  by steps.
