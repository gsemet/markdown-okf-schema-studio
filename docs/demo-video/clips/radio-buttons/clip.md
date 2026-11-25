---
title: Feature clip radio-buttons
status: draft
date: 2026-11-25
---

# Feature clip: radio-buttons

**This is the live storyboard.** The clip is built from this file: edit any row marked
*(on screen)*, save, and run `just clip radio-buttons render`, then `check`. Rows marked
*(filmed)* describe the footage of the take: changing them means a new take. `**bold**` in a text
takes the orange accent.

The clip is one continuous shot: one click on an option of the radio group in the page on the left,
then a zoom on the raw text on the right. It shows two texts in turn.

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
| Stage | `stage/plan.md` opened twice: in Studio (left, reading mode) and in the built-in text editor (right) |

## 1. Click an option

![The pointer on the round control of "Cache the page between sessions", before the click](frames/pointed.png)

![The second option selected in the page and the x moved in the raw text](frames/chosen.png)

| Field | Content |
| --- | --- |
| Time | 0 to 4.2 s (pointer on the second option's control at 0.96 s, click at 1.33 s, the page shows it selected and the raw text shows the moved `x` by 3.4 s (the run checks both within 2 s of the click), key frame `chosen` at 3.44 s) |
| Shot *(filmed)* | Studio in reading mode on `plan.md` (left): the heading, the sentence, the label "Approach:" and three round controls in place of the bullets, the first one selected. The same file as raw text (right), with its `- (x)` and `- ( )` lines. The pointer moves to the round control of "Cache the page between sessions" and clicks: that control shows the dot, the first one is cleared. On the right, line 7 changes to `- ( ) Render the visible blocks first` and line 8 to `- (x) Cache the page between sessions`. |
| Text 1 *(on screen)* | Lists of ( ) and (x) become a **radio group** |

## 2. Zoom on the raw text

![Mark 1 on the new (x) in the raw text](frames/04-mark-1.png)

![Mark 2 on the old option, now ( )](frames/05-mark-2.png)

| Field | Content |
| --- | --- |
| Time | 4.2 to 10.5 s (zoom from 4.45 s, held to 9.5 s, then back to the start for the loop) |
| Shot *(filmed)* | Zoom (at most 2x) on the lines "Approach:" to "Leave as is" in the text editor (right). |
| Zoom | raw, hold to 9.5 s |
| Mark 1 *(on screen)* | Orange outline around the new (x) of "Cache the page between sessions", 5.0 to 6.6 s |
| Mark 2 *(on screen)* | Orange outline around the old option, now ( ), of "Render the visible blocks first", 6.6 to 8.2 s |
| Text 2 *(on screen)* | One click moves the **(x)** in the file |

Expected result, the scenario's check: in the page, the control of "Cache the page between
sessions" has `aria-checked="true"` and the two others `"false"`; `plan.md` on disk (auto-save is
on) is exactly this text:

```markdown
# Plan: faster preview start

The preview takes two seconds to open on large files.

Approach:

- ( ) Render the visible blocks first
- (x) Cache the page between sessions
- ( ) Leave as is
```

## Review notes

- Behaviour checked at `origin/main`: the syntax and the "one click moves the `x`" rule in
  `skills/writing-for-markdown-okf-schema-studio/SKILL.md` and `docs/user/editing.md` (radio choice
  lists); rendering in `src/core/render/radioMarkers.ts` and `radioGroups.ts` (`.myst-radio`,
  `role="radio"`, `aria-checked`, `data-myst-radio-line`, `data-myst-radio-column`), the look in
  `src/core/preview/styles/contentLayoutStyles.ts` (round controls in place of the bullets); the
  click in SwRS-MDOKFSTUDIO-GFM-040 (render) and SwRS-MDOKFSTUDIO-GFM-041 (choice: in reading or
  edit mode, the page shows the choice at once, two lines change, one undo step, no block editor
  opens).
- The scenario clicks the `.myst-radio` control whose `data-myst-radio-line` is 8 (1-based source
  line of "Cache the page between sessions", one-based per `src/core/render/radioMarkers.ts`). It
  reads the right editor's lines as `drag-list-item` does.
- Opening the same file in the text editor beside Studio is done off camera; both show one file, so
  the raw text updates as soon as the page writes. The pointer is parked in the blank area below the
  list.
- Reading mode is chosen so no edit-mode handles or block outlines show; the choice works in both
  modes (GFM-041).
- After the click the chosen option keeps the focus. Its ring is drawn on `:focus-visible` only,
  so a mouse click should show no ring: the frames show none: in `frames/chosen.png` the second control shows its dot, with the pointer over it, and no ring around it.
- The clip ends with the second option chosen and starts with the first: the loop seam relies on
  the kit's return to the start, as in `drag-list-item` (a two-character change in the text and a
  dot that moves).
- Not filmed: the keyboard (Space, Enter, arrows), the undo, the refusal while a block editor is
  open, numbered and nested groups. Caption 1 names the syntax as plain text, because the clip's
  caption pill renders only `**bold**`, not code.
- Measured by the trial take, which is the take: filmed 10.53 s played in 10.5 s (playback rate 1.003); pointer on the second control at 0.96 s (key frame `pointed`), click at 1.33 s, key frame `chosen` at 3.44 s; zoom from 4.44 s; mark 1 from 5.04 to 6.64 s and mark 2 from 6.64 to 8.24 s; the pointer is back at its start before 10.5 s.
- Key frames: `frames/pointed.png` (pointer on the second control, first option selected, raw text
  with `(x)` on line 7), `frames/chosen.png` (second option selected in the page, `(x)` on line 8 in
  the raw text, no focus ring), `frames/04-mark-1.png`, `frames/05-mark-2.png`. Not checked by the author: motion, rhythm, the loop as watched.
