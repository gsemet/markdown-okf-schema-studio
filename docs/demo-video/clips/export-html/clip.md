---
title: Feature clip export-html
status: draft for the owner's review
date: 2026-11-25
---

# Feature clip: export-html

**This is the live storyboard.** The clip is built from this file: edit any row marked
*(on screen)*, save, and run `just clip export-html render`, then `check`. Rows marked
*(filmed)* describe the take: changing them means a new take. The owner reviews this file and the
clip in the pull request; the times and pictures come from the batch's take. `**bold**` in a text
takes the orange accent.

The clip is one continuous shot: the export in Studio, then the exported file in a browser,
zoomed. It shows two texts in turn.

The browser is VS Code's own Integrated Browser, opened from the command palette inside the filmed
window: the kit films the VS Code window only (a CDP screencast of its page), so an outside browser
cannot be in the shot. `setup` starts a small static server on `http://localhost:5170/` over the
workspace (Node.js, off camera), so the address bar shows no file path; the server never holds the
kit's process open.

## Clip

| Field | Content |
| --- | --- |
| Length | 12.0 s |
| Size *(on screen)* | 1280x720 16:9 |
| Frame rate *(on screen)* | 15 fps |
| Outputs | silent, loops; MP4 (X, release), WebM (docs site), GIF 960 px (release notes, docs page) |
| Cards | none |
| Logo | top right |
| Setting filmed | `files.simpleDialog.enable`: on (the save dialog is VS Code's own, inside the window, not the system dialog) |
| Filmed on | Windows, the VS Code version and the extension version written in `check.json`, VSIX built from the branch |
| Stage | `stage/team-handbook.md` (Studio, the whole window, reading mode, Dark theme): a heading, a sentence, a Mermaid flowchart and a tab set of two tabs |

Off camera (`setup`): the toolbar expanded, the Theme button clicked from Cream to Dark (through
the current theme), the local server started.

## 1. Export, then open the file

Pictures: ![The save dialog](frames/save-dialog.png) ![The Integrated Browser opened](frames/browser-opened.png) ![The exported page](frames/exported.png)

| Field | Content |
| --- | --- |
| Time | 0 to 5.6 s (click Export at 0.8 s, Enter in the save dialog at 2.0 s, command palette at 2.8 s, "Browser: Open Integrated Browser" chosen at 4.0 s, the address entered at 5.0 s, the page shown at 5.6 s) |
| Shot *(filmed)* | Studio on `team-handbook.md` in Dark. The pointer clicks the Export button of row 1 ("Export to HTML"). VS Code's save dialog opens at the top with `team-handbook.html` proposed; Enter. Command palette chord; "Browser: Open Integrated Browser" is typed and chosen; `http://localhost:5170/team-handbook.html` is typed in its address bar; Enter. The Integrated Browser shows the exported page, in Dark. |
| Text 1 *(on screen)* | **Export** the page to one HTML file |
| Badge palette *(on screen)* | Ctrl+Shift+P / ⇧⌘P |

## 2. The same page in the browser

Pictures: ![Zoom on the page](frames/03-zoomed.png) ![Mark 1 on the flowchart](frames/04-mark-1.png) ![Panel Release after the click](frames/release.png) ![Mark 2 on the tab set](frames/05-mark-2.png)

| Field | Content |
| --- | --- |
| Time | 5.6 to 12.0 s (zoom from 6.0 s, held to 11.0 s; click on the tab "Release" at 8.4 s; then back to the start for the loop) |
| Shot *(filmed)* | Zoom (at most 2x) on the Integrated Browser: the heading, the flowchart and the tab set in Dark, as in Studio. The pointer clicks the tab "Release": its panel replaces "Review". |
| Zoom | page, hold to 11.0 s |
| Mark 1 *(on screen)* | Orange outline around the flowchart, 6.6 to 8.0 s |
| Mark 2 *(on screen)* | Orange outline around the tab set, after the click, 8.6 to 10.2 s |
| Text 2 *(on screen)* | Any browser shows the **same themed page** |

Expected result, the scenario's check (read from disk and from the Integrated Browser's page):

- `team-handbook.html` exists next to `team-handbook.md`, and it is the only new file in the
  workspace.
- It loads nothing from another file or the network: no `<script`, no `<link`, no `@import`, no
  `src` or `href` to a local file, the flowchart embedded as SVG.
- It carries the Dark theme mode of the page at the export.
- In the Integrated Browser, after the click, the panel "We release on Thursday, after the smoke
  tests." is shown and "Every change gets one approving review." is hidden (the exported tab set
  uses radio inputs and labels, so the file's style sheet shows or hides a panel, not `hidden`).
- `team-handbook.md` on disk is byte for byte `stage/team-handbook.md`.

## Review notes

- The command palette part (about 3 s) is the slowest beat. Option for the owner: `setup` opens the
  Integrated Browser before the take, on the address that does not exist yet, and the clip only
  reloads it after the export; it saves about 2 s but shows a "not found" page at frame 0.
- The Simple Browser is not in the desktop command palette of VS Code 1.147.0 and opens the
  Integrated Browser, so the clip films the Integrated Browser; the trial proved its page is in the
  screencast frames.
- With `files.simpleDialog.enable` on, the save dialog is a VS Code input; without it, the system
  dialog is outside the filmed page and the take would hang.
- The address bar shows `localhost:5170`: no personal path. The port is free on the take's machine
  or the scenario picks another and the caption is unchanged.
- The trial showed that the Integrated Browser's page is in the screencast frames, once the
  information message is dismissed: while a notification shows, the browser view is paused
  ("Paused due to Notification"). `run` dismisses the message after the save, through the
  notification's clear button, so it is not in the clip.
- The flowchart of the exported file is an `<img>` with a `data:image/svg+xml` source, not an inline
  `<svg>`: the scenario's check accepts both.
- The top edge of the zoomed browser frames shows a thin strip of the title bar: the zoom is the
  browser view's rectangle with a margin, not a crop of the page alone.
- Studio's information message (not filmed, see above) "Exported to `team-handbook.html`." is the feature's own
  confirmation, dismissed off the shot.
- The badge `⇧⌘P` is drawn as one keycap (the kit splits a `⌘` group only when it starts with `⌘`).
- The clip ends with the browser open and starts without it: the loop seam relies on the kit's
  return to the start.
