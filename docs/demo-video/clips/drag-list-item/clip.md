---
title: Feature clip drag-list-item
status: draft
date: 2026-11-25
---

# Feature clip: drag-list-item

**This is the live storyboard.** The clip is built from this file: edit any row marked
*(on screen)*, save, and run `just clip drag-list-item render`, then `check`. Rows marked
*(filmed)* describe the footage of the take: changing them means a new take. `**bold**` in a text
takes the orange accent.

The clip is one continuous shot: the drag in the page on the left, then a zoom on the raw text on
the right. It shows two texts in turn.

## Clip

| Field | Content |
| --- | --- |
| Length | 10.5 s |
| Size *(on screen)* | 1280x720 16:9 |
| Frame rate *(on screen)* | 15 fps |
| Outputs | silent, loops; MP4 (X, release), WebM (docs site), GIF 960 px (release notes, docs page) |
| Cards | none |
| Logo | top right |
| Setting filmed | none: every setting at its default |
| Filmed on | Windows, VS Code 1.147.0, extension 1.12.1 VSIX built from the branch |
| Stage | `stage/release-steps.md` opened twice: in Studio (left, edit mode) and in the built-in text editor (right) |

## 1. Drag the item by its handle

![The item "Build the packages." dragged by its handle above "Tag the release.": the drop line shows where it lands](frames/drag.png)

![The new order in the page and in the raw text](frames/dropped.png)

| Field | Content |
| --- | --- |
| Time | 0 to 4.2 s (pointer on the handle at 0.9 s, press at 1.26 s, drag 1.26 to 2.5 s with the drop line shown, drop at 2.6 s, the page and the raw text show the new order by 3.6 s) |
| Shot *(filmed)* | Studio in edit mode on `release-steps.md` (left), the same file as raw text (right). The pointer moves to the handle left of item 2, "Build the packages." (title "Drag to move item (Alt+Up, Alt+Down)"), presses and drags it up above item 1, "Tag the release.", then drops. The item moves with its two sub-items; the page shows 1 Build the packages, 2 Tag the release, 3 Run the smoke tests, 4 Publish the notes. The raw text on the right changes to the same order. |
| Text 1 *(on screen)* | Drag a list item by its **handle**, sub-items come along |

## 2. Zoom on the raw text

![Mark 1 on the moved lines in the raw text](frames/04-mark-1.png)

![Mark 2 on the numbers 1. to 4.](frames/05-mark-2.png)

| Field | Content |
| --- | --- |
| Time | 4.2 to 10.5 s (zoom from 4.45 s, held to 9.5 s, then back to the start for the loop) |
| Shot *(filmed)* | Zoom (at most 2x) on the list in the text editor (right), the heading in view. |
| Zoom | raw, hold to 9.5 s |
| Mark 1 *(on screen)* | Orange outline around the moved lines "1. Build the packages." and its two sub-items, 5.0 to 6.6 s |
| Mark 2 *(on screen)* | Orange outline around the numbers 1. to 4., 6.6 to 8.2 s |
| Text 2 *(on screen)* | The **raw text** follows, numbers kept in order |

Expected result, the scenario's check: `release-steps.md` on disk (auto-save is on) is exactly this
text:

```markdown
# Release steps

1. Build the packages.
   - Linux and macOS
   - Windows
2. Tag the release.
3. Run the smoke tests.
4. Publish the notes.
```

## Review notes

- The handle uses HTML drag and drop (`draggable`, `dragstart`, `dragover`); the kit's mouse goes
  through CDP into the preview webview. A CDP drag shows no floating copy of the item: the drag
  shows as the item faded in place and a line where it will land; the item moves there on release.
- The handles show as soon as edit mode is on; the pointer reaches the handle before the press, and
  `setup` checks edit mode is on.
- Opening the same file in the text editor beside Studio is done off camera; both show one file, so
  the raw text updates as soon as the page writes.
- The raw screencast runs at about 3.6 frames per second (measured by the take): the pointer is drawn
  smooth by the kit, but the drop line and the page change by steps.
- The clip ends with the new order and starts with the old one: the loop seam relies on the kit's
  return to the start.
- Measured by the trial take, which is the take: filmed 10.54 s played in 10.5 s (playback rate 1.004); press
  at 1.26 s; key frame `drag` at 2.46 s and `dropped` at 3.64 s; zoom from 4.45 s; mark 1 from
  5.04 to 6.64 s and mark 2 from 6.65 to 8.24 s; the pointer is back at its start before 10.5 s.
- Key frames: `frames/drag.png` (the drop line shows before "Tag the release.", the item faded in
  place), `frames/dropped.png` (new order in the page and in the raw text), `frames/04-mark-1.png`,
  `frames/05-mark-2.png`. Not checked by the author: motion, rhythm, the loop as watched.
