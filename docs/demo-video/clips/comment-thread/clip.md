---
title: Feature clip comment-thread
status: draft
date: 2026-11-25
---

# Feature clip: comment-thread

**This is the live storyboard.** The clip is built from this file: edit any row marked *(on screen)*,
save, and run `just clip comment-thread render`, then `check`. Rows marked *(filmed)*
describe the take: changing them means a new take. The text of an *(on screen)* row is the clip's
exact text (`**bold**` takes the orange accent).

The clip is one continuous shot: the selection and the comment, then a zoom on the open thread. It
shows two texts in turn. The times and the pictures follow the last take and render; the maintainer
reviews the storyboard and the cut in the pull request, after the take.

## Clip

| Field | Content |
| --- | --- |
| Length | 11.3 s |
| Size *(on screen)* | 1280x720 16:9 |
| Frame rate *(on screen)* | 15 fps |
| Outputs | silent, loops; MP4 (X, release), WebM (docs site), GIF 960 px (release notes, docs page) |
| Cards | none |
| Logo | top right |
| Setting filmed | `markdownOkfSchemaStudio.comments.authorName`: `Reviewer` (the kit's profile) |
| Filmed on | Windows, VS Code 1.147.0, extension 1.12.1 VSIX built from the branch |
| Stage | `stage/proposal.md` (Studio, the whole window, reading mode); no `proposal.comments.json` at frame 0 |

## 1. Select a sentence and comment

![The sentence is selected, the Comment button pressed and the comment typed, just before the save chord](frames/01-selected.png)

![Just after the save chord: the box has closed and the sentence is highlighted](frames/02-pasted.png)

| Field | Content |
| --- | --- |
| Time | 0 to 5.0 s (drag 0.9 to 2.0 s, click Comment at 2.65 s, typing 2.9 to 4.3 s, save at 4.6 s) |
| Shot *(filmed)* | Studio in reading mode on `proposal.md`. The mouse drags over the sentence "We drop support for Node 18 in this release." The small Comment button appears beside the selection; the pointer clicks it. The box "Write a comment" opens; the text "Can we keep it one more release?" is typed. Save chord. The sentence is highlighted. |
| Text 1 *(on screen)* | Select a passage and **comment** on it in the page |
| Badge save *(on screen)* | Ctrl+Enter / ⌘Enter |

## 2. The thread, zoomed

![Zoom on the thread, held](frames/03-zoomed.png)

![Mark 1 on the highlighted sentence](frames/04-mark-1.png)

![Mark 2 on the Reply box and the Resolve button](frames/05-mark-2.png)

| Field | Content |
| --- | --- |
| Time | 5.0 to 11.3 s (click on the highlight at 5.45 s, zoom from 5.8 s, held to 9.6 s, a click beside the paragraph closes the thread at 10.4 s, then back to the start for the loop) |
| Shot *(filmed)* | The pointer clicks the highlighted sentence: the thread popover opens under it with the author "Reviewer", the date, the comment, the Reply box and the Resolve and Delete buttons. Zoom (at most 2x) on the highlighted sentence and the popover. |
| Zoom | thread, hold to 9.6 s |
| Mark 1 *(on screen)* | Orange outline around the highlighted sentence, 6.3 to 7.5 s |
| Mark 2 *(on screen)* | Orange outline around the Reply box and the Resolve button, 7.5 to 8.9 s |
| Text 2 *(on screen)* | Threads live in **.comments.json**, next to the file |

Expected result, the scenario's check: `proposal.comments.json` exists next to `proposal.md`
(read from disk), and `proposal.md` is unchanged. The ids and dates change at each take; the rest is
exact:

```json
{
  "version": 1,
  "document": "proposal.md",
  "threads": [
    {
      "id": "<any>",
      "anchor": { "line": "<the paragraph line>", "quote": "We drop support for Node 18 in this release.", "...": "prefix, suffix, endLine as written" },
      "resolved": false,
      "createdAt": "<the take's time>",
      "comments": [
        { "id": "<any>", "author": "Reviewer", "createdAt": "<the take's time>", "body": "Can we keep it one more release?" }
      ]
    }
  ]
}
```

## Review notes

- Studio opens no thread by itself after Save: the thread opens on the click on the highlight.
- The popover shows the take's date: harmless, but it ages the clip. No personal name: the author is
  the profile's `Reviewer`. With `comments.authorName` empty (the default), the popover shows the Git
  `user.name`: not filmed, it would show personal data.
- The take must start with no comments file: the stage holds none, and the kit copies the stage into
  a fresh workspace at each setup; the scenario fails the take when one exists (run `setup` again).
- A typed reply (as the intake allows) would add about 2 s and push the clip past 12 s; not filmed,
  nor Resolve or Delete. The `.comments.json` file is named by Text 2 only, not shown: showing it
  would need a second pane.
- The selection must start and end on the sentence's own characters (the kit's `selectText`), so
  the quote stored is exactly the sentence.
- The thread is closed by a click beside the paragraph, not by Escape: every key press of a take
  needs a `Badge` row, and Escape would add a badge.
- `01-selected` and `02-pasted` are the kit's fixed names for the first and the last key press: here
  the picture just before the save chord (the selection is gone, the typed comment is in the box) and
  the one just after it. `03-zoomed` is taken at the middle of the zoom hold, which falls in mark 2.
- The raw screencast ran at 6.4 frames per second (`rawFps`): the pointer is drawn smooth by the kit,
  but the selection and the typing grow by steps. A 15 fps output does not change it.
- The storyboard is reviewed in the pull request, after the take (a deviation from the feature clip
  process, decided in the batch): an *(on screen)* row changed there is a render, a *(filmed)* row is
  a retake.
