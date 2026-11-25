---
title: Feature clip block-editor-modes
status: draft
date: 2026-11-25
---

# Feature clip: block-editor-modes

**This is the live storyboard.** The clip is built from this file: edit any row marked
*(on screen)*, save, and run `just clip block-editor-modes render`, then `check`. Rows marked
*(filmed)* describe the footage of the take: changing them means a new take. `**bold**` in a text
takes the orange accent.

The clip is one continuous shot: a click opens the block editor of a paragraph in GFM mode, one
shortcut switches the palette to MyST, then a zoom on the palette and the page around it. It shows
two texts in turn.

What "mode" means here: the palette mode (Strict, GFM, MyST, Full), chosen with the select at the
start of the edition palette and kept per workspace (`editing.defaultPaletteMode` until a choice is
made). Modes are additive and choose the buttons only; the rendering is the same in every mode.
The clip films GFM, then MyST.

## Clip

| Field | Content |
| --- | --- |
| Length | 12.0 s |
| Size *(on screen)* | 1280x720 16:9 |
| Frame rate *(on screen)* | 15 fps |
| Outputs | silent, loops; MP4 (X, release), WebM (docs site), GIF 960 px (release notes, docs page) |
| Cards | none |
| Logo | top right |
| Setting filmed | `markdownOkfSchemaStudio.editing.defaultPaletteMode`: `gfm` (the default, written out so the start mode is explicit) |
| Filmed on | Windows, VS Code 1.147.0, extension 1.12.1 VSIX built from the branch |
| Stage | `stage/release-plan.md` (Studio, the whole window, edit mode): a heading, a GitHub alert `> [!NOTE]`, one paragraph and a MyST `tip` admonition |

Off camera (`setup`): edit mode on, no block editor open, and the palette mode reset to GFM. The
mode is stored per workspace and the clip ends in MyST, so `setup` opens the paragraph's editor
and, if its palette is not in GFM, presses Ctrl+Shift+M, types `g` (the select jumps to "GitHub
(GFM)") and presses Escape until the editor is closed. The pointer is parked in the page's right
margin.

## 1. The block editor, in GFM mode

![The block editor of the paragraph in GFM mode: the select reads GitHub (GFM), the plain Markdown buttons and the GitHub group](frames/gfm.png)

![Ctrl+Shift+M has focused the mode select, which still reads GitHub (GFM)](frames/mode-select.png)

| Field | Content |
| --- | --- |
| Time | 0 to 4.4 s (click at the end of the paragraph at 1.0 s, pointer back to the margin by 1.9 s, key frame `gfm` at 2.4 s, Ctrl+Shift+M at 3.2 s, key frame `mode-select` at 3.6 s) |
| Shot *(filmed)* | Studio in edit mode on `release-plan.md`. The pointer clicks at the end of the paragraph: its block editor opens, the Markdown source in the text box and the edition palette above it, its select reading "GitHub (GFM)": the plain Markdown buttons, then the GitHub group (Alert, Checkbox, Option, HTML table, Collapsible, Footnote, Mermaid, Column alignment, Key). The pointer goes back to the margin. Ctrl+Shift+M: the focus moves to the select. |
| Text 1 *(on screen)* | Click a block: its editor shows the **GFM** buttons |
| Badge mode *(on screen)* | Ctrl+Shift+M / ⇧⌘M |

## 2. Switch to MyST

![The palette reads MyST and the MyST group has joined it](frames/myst.png)

![Zoom on the palette, the GitHub alert and the MyST tip](frames/03-zoomed.png)

![Mark 1 on the MyST buttons of the palette](frames/04-mark-1.png)

![Mark 2 on the rendered GitHub alert](frames/05-mark-2.png)

![Mark 3 on the rendered MyST tip](frames/06-mark-3.png)

| Field | Content |
| --- | --- |
| Time | 4.4 to 12.0 s (Down at 4.5 s, key frame `myst` at 5.0 s, zoom from 5.2 s, held to 10.4 s, unzoom to 11.0 s, Escape at 11.3 s) |
| Shot *(filmed)* | Down on the focused select: it reads "MyST" and the MyST group joins the palette (Admonition, Definition list, Math, Subscript, Superscript, Label, Reference, Document link, Citation, Dropdown, Table with caption, List table, Pipe table, Figure, Card, Grid, Content tabs, Key (MyST), Code-block (MyST)); the focus is back in the text box, which is unchanged. Zoom (at most 2x) on the palette, the GitHub alert above and the MyST tip below: both still rendered as before. After the unzoom, Escape closes the editor with no change and the page is as at the start. |
| Badge down *(on screen)* | ↓ |
| Zoom | modes, hold to 10.4 s |
| Mark 1 *(on screen)* | The MyST buttons of the palette, 5.9 to 7.5 s |
| Mark 2 *(on screen)* | The rendered GitHub alert, 7.7 to 8.9 s |
| Mark 3 *(on screen)* | The rendered MyST tip, 9.1 to 10.3 s |
| Text 2 *(on screen)* | **MyST** adds buttons; the page renders the same |

Expected result, the scenario's check (visible state, read from the preview; the file is never
changed):

- After the click, the block editor's text box holds "The release adds offline maps and a faster
  search. Two people review every change." and the palette (`[data-sphinx-edit-palette="true"]`)
  has `data-palette-mode="gfm"`, a select reading `gfm`, 9 buttons of the `github` group and none of
  the `myst` group.
- After Ctrl+Shift+M the select has the focus. After Down the palette has
  `data-palette-mode="myst"`, the select reads `myst`, the 9 `github` buttons are still there and the
  19 `myst` buttons are added (no `full` button: Vega-Lite, Vega and PlantUML are Full only). The
  text box is unchanged and has the focus.
- The two rendered `.admonition` blocks (the GitHub alert and the MyST tip) are the same before the
  click, after the switch and after Escape (comparison: outer HTML, identical).
- After Escape no block editor is open, and `release-plan.md` on disk is byte for byte
  `stage/release-plan.md`.

## Review notes

- Every claim is from origin/main: the modes and their button sets in
  `src/core/palette/paletteActions.ts` (modes are additive: `strict` in all, `gfm` in GFM, MyST and
  Full, `myst` in MyST and Full, `full` in Full only); the select, its labels and its change in
  `src/page/modules/editPalette.ts`; Ctrl+Shift+M in `src/page/features/blockSourceEditor.ts`
  (SwRS-MDOKFSTUDIO-PALETTE-001, PALETTE-017, LIFE-169); "it changes buttons only, never the
  rendering" in `src/session/features/viewState.ts`, `docs/user/settings.md`,
  StRS-MDOKFSTUDIO-CORE-001 and the writing skill (`SKILL.md`: every syntax renders in every mode).
- The render does not differ between modes: the render pipeline has no mode. The clip says so
  (Text 2, marks 2 and 3) instead of inventing a difference. The GitHub alert renders as an
  admonition, like the MyST tip.
- Other mode effects, not filmed: the `/` menu lists the same entries as the palette and ranks the
  MyST group first in MyST mode; a table cell editor's palette follows the mode; Key (GFM) writes
  `<kbd>` and Key (MyST) writes `{kbd}`. Strict and Full are not filmed.
- The switch is done with the keyboard, the documented path (Ctrl+Shift+M, then Down on the
  focused select): a click on the select opens the native option list, which is likely drawn
  outside the screencast frames. On Windows and Linux, Down on a closed focused select changes the
  value at once; on macOS it opens the list, so the take is filmed on Windows and the macOS path is
  not proved. If the trial shows Down does not change the mode, typing `m` (the select jumps to
  "MyST") replaces it, with the badge `M`. No kit change is needed.
- Ctrl+Shift+M does not open VS Code's Problems panel (VS Code binds it there): the text box stops
  the key's propagation before the webview forwards it. The frames after the press (`mode-select`, `myst`) show no Problems panel.
- `⇧⌘M` is drawn as one keycap: the kit splits a `⌘` group only when it starts with `⌘`.
- `01-selected` and `02-pasted` are the kit's fixed key frame names (here, just before Ctrl+Shift+M
  and just after Down); they are kept and not linked.
- The MyST group adds 19 buttons, so the palette wraps to more rows. Mark 1 is the union of the
  `[data-edit-group="myst"]` button boxes; if they span two rows, the outline covers both rows.
- The palette opens under the click point: the pointer goes back to the margin at once so no
  button tooltip shows.
- The clip starts and ends with no editor open and the same page; only the stored palette mode
  differs (MyST), which `setup` resets before each take. Escape has no badge: it only returns to
  the start for the loop.
- Measured by the take: filmed 12.05 s played in 12.0 s (playback rate 1.004); click at 1.05 s, key
  frames `gfm` at 2.45 s, `mode-select` at 3.64 s and `myst` at 5.05 s, Ctrl+Shift+M at 3.25 s,
  Down at 4.54 s, zoom from 5.27 s, mark 1 from 5.95 to 7.55 s, mark 2 from 7.75 to 8.95 s, mark 3
  from 9.15 to 10.34 s, unzoom at 10.4 s. The raw screencast runs at about 4.6 frames per second
  (`rawFps` of `check.json`): the pointer is drawn smooth by the kit, the typing and the page change
  by steps. GFM: 9 `github`, 0 `myst`; MyST: 9 `github`, 19 `myst`, 0 `full`, the text box focused
  and unchanged. Only 17 of the 19 MyST buttons have a box on screen, so mark 1 is the union of
  those 17: it covers the second row of the palette from Admonition to Code-block.
- The key frames are `frames/gfm.png`, `mode-select.png`, `myst.png`, `03-zoomed.png`,
  `04-mark-1.png`, `05-mark-2.png`, `06-mark-3.png`, plus `01-selected.png` and `02-pasted.png`.
- At the last frames, after Escape, the paragraph shows Studio's faint hover outline and block
  handle while it fades; no editor is open. The take's `setup` found the stored mode already GFM
  (a fresh profile), so its reset path (`g`, then `selectOption`) was not exercised.
- The storyboard is reviewed in the pull request after the take (block-editor-Q3). Not checked by
  the author: motion, rhythm, the loop as watched.
