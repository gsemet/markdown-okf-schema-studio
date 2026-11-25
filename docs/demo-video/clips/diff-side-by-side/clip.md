---
title: Feature clip diff-side-by-side
status: draft
date: 2026-11-25
---

# Feature clip: diff-side-by-side

**This is the live storyboard.** The clip is built from this file: edit any row marked
*(on screen)* (the text is the clip's exact text; `**bold**` takes the orange accent), save, and run
`just clip diff-side-by-side render`, then `check`. Rows marked *(filmed)* describe the take:
changing them means a new take. The maintainer reviews this storyboard and the clip in the pull
request that adds them.

One continuous shot: the two toolbar clicks, then a zoom on one diff card. Two texts in turn.

## Clip

| Field | Content |
| --- | --- |
| Length | 11.0 s |
| Size *(on screen)* | 1280x720 16:9 |
| Frame rate *(on screen)* | 15 fps |
| Outputs | silent, loops; MP4 (X, release), WebM (docs site), GIF 960 px (release notes, docs page) |
| Cards | none |
| Logo | top right |
| Setting filmed | none (defaults: `markdownOkfSchemaStudio.preview.showIncomingChanges` on) |
| Filmed on | Windows, VS Code 1.147.0, extension 1.12.1 VSIX built from the branch |
| Stage | `stage/deploy-guide.md` (Studio, the whole window, reading mode), in a workspace that is a Git repository whose last commit holds `stage/deploy-guide.committed.md` as `deploy-guide.md` |

Stage, what changes since the commit (two blocks; the heading and the last paragraph do not change):

- Paragraph: "Tuesday" becomes "Wednesday", and "and the smoke tests" is added after "nightly build"
  ("is green" becomes "are green").
- Ordered list: "one at a time" becomes "two at a time" (item 2), "ten minutes" becomes "thirty
  minutes" (item 3).

Off camera (`setup`): the Git repository and its one commit, the working copy left uncommitted;
the toolbar expanded (a new workspace starts collapsed), reading mode, Side-by-side off, the Diff
button switched off so the green bars are hidden at frame 0.

## 1. Diff marks the changed blocks

![Diff on: a green bar left of the paragraph and of list items 2 and 3](frames/diff-on.png)

![Mark 1 around the three green bars](frames/04-mark-1.png)

| Field | Content |
| --- | --- |
| Time | 0 to 3.4 s (click Diff at 1.25 s, the green bars at about 1.4 s) |
| Shot *(filmed)* | Studio in reading mode on `deploy-guide.md`, the toolbar open top right. The pointer moves to the Diff button of row 4 ("Show changes since last commit") and clicks. A green bar appears left of the paragraph and of each changed list item (items 2 and 3; Studio marks the innermost changed block, one bar per item); the heading, list item 1 and the last paragraph get none. |
| Text 1 *(on screen)* | Diff marks every block **changed** since the last commit |
| Mark 1 *(on screen)* | Orange outline around the three green bars, 2.05 to 3.25 s |

## 2. Side-by-side, then zoom on a card

![Side-by-side on: the paragraph and the list each a card, last commit left, now right](frames/side-by-side.png)

![Zoom on the paragraph's card, mark 2 on the struck "Tuesday"](frames/05-mark-2.png)

![Mark 3 on the underlined "Wednesday"](frames/06-mark-3.png)

![Mark 4 on the underlined "and the smoke tests are"](frames/07-mark-4.png)

| Field | Content |
| --- | --- |
| Time | 3.4 to 11.0 s (click Side-by-side at 3.45 s, zoom from 4.67 s, held to 10.0 s, then back to the start for the loop) |
| Shot *(filmed)* | The pointer moves one button left, to Side-by-side ("Show side-by-side changes since last commit"), and clicks. The paragraph and the list each become a card: the block at the last commit on the left, as it is now on the right. Zoom (at most 2x) on the paragraph's card. |
| Zoom | card, hold to 10.0 s |
| Mark 2 *(on screen)* | Orange outline around the struck "Tuesday" (left), 5.45 to 6.85 s |
| Mark 3 *(on screen)* | Orange outline around the underlined "Wednesday" (right), 6.85 to 8.25 s |
| Mark 4 *(on screen)* | Orange outline around the underlined "and the smoke tests are" (right), 8.25 to 9.65 s |
| Text 2 *(on screen)* | Side-by-side shows **before and after**, word by word |

Expected result, the scenario's check (visible state, read from the preview; the file is never
changed):

- Three change bars before Side-by-side (the paragraph, list items 2 and 3), then two diff cards, no more: the paragraph and the whole list (one card for the list, not one per item).
- Paragraph card: "Tuesday" and "is" struck on the left; "Wednesday" and "and the smoke tests are"
  underlined on the right (consecutive changed words form one marked range).
- List card: "one" and "ten" struck on the left; "two" and "thirty" underlined on the right.
- `deploy-guide.md` on disk is byte for byte `stage/deploy-guide.md`, and `git status` shows it
  modified only.

## Review notes

- The kit has no Git step: the scenario's `setup` makes the repository and the commit off camera
  (Git on `PATH`, a neutral `user.name` and `user.email` set in the repository only, so no personal
  name shows).
- The green bars need a trusted workspace and a file known to Git: the kit's profile turns workspace
  trust off, so the workspace counts as trusted.
- The Diff and Side-by-side choices are kept per workspace: `setup` switches both off after the
  page opens, so frame 0 has no bars and no cards. The toolbar tooltips slide in on hover: the
  pointer leaves the buttons before the zoom.
- The clip ends with the cards shown and starts without them: the kit's last frames cross-fade to
  frame 0 for the loop.
- Mark 1 is shown before the zoom; the other marks during it.
- Studio marks the innermost changed block: the paragraph and each changed list item get a bar (three bars), while Side-by-side groups the changed list into one card. Mark 1 outlines the three bars, so its box also covers the unchanged item 1 between them.
- The raw screencast's frame rate (`rawFps` in `check.json`): 2.3 fps (the screencast sends a frame when the page changes; the kit draws the pointer smooth, the bars and the cards appear by steps).
- Measured by the take: filmed 11.05 s played in 11.0 s (playback rate 1.004); click Diff at 1.25 s, key frame `diff-on` at 1.89 s, mark 1 from 2.04 to 3.24 s, click Side-by-side at 3.46 s, key frame `side-by-side` at 4.47 s, zoom from 4.66 s, marks 2 to 4 from 5.45 to 9.65 s. Not checked by the author: motion, rhythm, the loop as watched.
