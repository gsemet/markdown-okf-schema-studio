---
title: Feature clip export-html
status: draft for the owner's review
date: 2026-11-26
---

# Feature clip: export-html

**This is the live storyboard.** The clip is built from this file: edit any row marked
*(on screen)*, save, and run `just clip export-html render`, then `check`. Rows marked
*(filmed)* describe the take: changing them means a new take. The owner reviews this file and the
clip in the pull request; the times and pictures come from the batch's take. `**bold**` in a text
takes the orange accent.

The clip is one continuous shot in three beats: Studio scrolls through a long page, the page is
exported, then the exported file is shown in a browser, zoomed, with the same layout. It shows
three texts in turn.

The browser is VS Code's own Integrated Browser, opened from the command palette inside the filmed
window, as in the merged clip: the kit films the VS Code window only (a CDP screencast of its
page), so an outside browser cannot be in the shot. `setup` starts a small static server on
`http://localhost:5170/` over the workspace (Node.js, off camera), so the address bar shows no file
path; the server never holds the kit's process open.

## Clip

| Field | Content |
| --- | --- |
| Length | 18.0 s |
| Size *(on screen)* | 1280x720 16:9 |
| Frame rate *(on screen)* | 15 fps |
| Outputs | silent, loops; MP4 (X, release), WebM (docs site), GIF 960 px (release notes, docs page) |
| Cards | none |
| Logo | top right |
| Setting filmed | `markdownOkfSchemaStudio.preview.maxContentWidth`: 720 (default 960), so the wide table breaks out of a clearly narrower column; `files.simpleDialog.enable`: on (the save dialog is VS Code's own, inside the window) |
| Filmed on | Windows, the VS Code version and the extension version written in `check.json`, VSIX built from the branch |
| Stage | `stage/platform-report.md` (Studio, the whole window, reading mode, Cream theme, Auto width): a heading, a card grid, a 16-column table, a Mermaid flowchart and a Vega-Lite bar chart, a Mermaid sequence diagram and a Vega line chart (a full `vega` spec), a small table, a second card grid |

Off camera (`setup`): reading mode; the page in Cream, the default, so no Theme click; the toolbar
expanded, the Width button clicked from Margin (the default) to Auto, the toolbar collapsed again;
the local server started; the page scrolled to the top; the pointer parked off the toolbar and off
every block.

## 1. A long page in Studio

Pictures: ![The top of the page in Cream: the heading and the card grid](frames/top.png) ![The wide table breaking out of the column](frames/wide-table.png) ![The flowchart and the bar chart](frames/diagrams.png)

| Field | Content |
| --- | --- |
| Time | 0 to 5.8 s (wheel scroll from 0.6 s; the wide table in the middle of the view from 1.6 to 2.4 s; the flowchart and the bar chart in view from 3.2 to 3.8 s; on to the end of the page by 5.0 s; the pointer moves to the Export button from 5.1 s) |
| Shot *(filmed)* | Studio on `platform-report.md` in Cream, at the top: the heading and a grid of three cards. The pointer, over the page, scrolls it with the mouse wheel in small steps. The 16-column table comes into view: it is wider than the text column above it and centred on the page. The scroll goes on past the flowchart and the bar chart, the sequence diagram and the line chart, the small on-call table (inside the column) and the last card grid. Then the pointer moves to the Export button of the floating toolbar. |
| Text 1 *(on screen)* | A long page, with a **wide table**, diagrams and charts |

## 2. Export, then open the file

Pictures: ![The save dialog](frames/save-dialog.png) ![The command that opens the Integrated Browser, just before it appears](frames/browser-opened.png) ![The exported page at the top](frames/exported.png)

| Field | Content |
| --- | --- |
| Time | 5.8 to 10.0 s (click Export at 6.0 s, Enter in the save dialog at 7.0 s, command palette at 7.6 s, "Browser: Open Integrated Browser" typed and chosen, the browser on screen from 9.3 s, the address entered at 9.4 s, the page shown at 10.0 s) |
| Shot *(filmed)* | The pointer clicks the Export button ("Export to HTML"). VS Code's save dialog opens at the top with `platform-report.html` proposed; Enter. Studio's confirmation is dismissed off the shot. Command palette chord; "Open Integrated Browser" is typed and chosen; `http://localhost:5170/platform-report.html` is typed in its address bar; Enter. The Integrated Browser shows the exported page at its top, in Cream: the heading and the card grid, as at frame 0. |
| Text 2 *(on screen)* | **Export** it to one HTML file |
| Badge palette *(on screen)* | Ctrl+Shift+P / ⇧⌘P |

## 3. The same page in the browser

Pictures: ![Zoom on the page](frames/03-zoomed.png) ![Mark 1 on the wide table](frames/04-mark-1.png) ![Mark 2 on the flowchart](frames/05-mark-2.png) ![Mark 3 on the bar chart](frames/06-mark-3.png)

| Field | Content |
| --- | --- |
| Time | 10.0 to 18.0 s (zoom from 10.2 s, held to 17.0 s; wheel scroll in the browser sent from 10.8 s to the wide table, then from 13.2 s to the flowchart and the bar chart, the filmed picture changing at 11.0, 12.0 and 14.1 s; then back to the start for the loop) |
| Shot *(filmed)* | Zoom (at most 2x, about 1.25x so the wide table fits) on the browser's page. The pointer scrolls the exported page with the wheel, and the filmed window shows the two scrolls as jumps, not as motion: the first as a short step then a cut, the second as one cut. They bring first the 16-column table, breaking out of the column exactly as in Studio; then the flowchart and the bar chart, drawn, in the Cream colours. |
| Zoom | page, hold to 17.0 s |
| Mark 1 *(on screen)* | Orange outline around the wide table, 12.0 to 13.2 s |
| Mark 2 *(on screen)* | Orange outline around the flowchart, 14.2 to 15.2 s |
| Mark 3 *(on screen)* | Orange outline around the bar chart, 15.4 to 16.6 s |
| Text 3 *(on screen)* | The browser shows the **same page**, diagrams drawn |

Expected result, the scenario's check (read from Studio before the export, from disk, and from the
Integrated Browser's page):

- In Studio before the export: reading mode, theme mode `cream`, width mode `auto`; the wrapper of
  the 16-column table carries `data-sphinx-preview-wide` and is wider than the text column (a
  paragraph); the on-call table does not, and stays inside the column.
- `platform-report.html` exists next to `platform-report.md`, and it is the only new file in the
  workspace.
- It loads nothing from another file or the network: no `<script`, no `<link`, no `@import`, no
  `src` or `href` to a local file.
- Its `<html>` carries `data-sphinx-preview-theme-mode="cream"` and
  `data-sphinx-preview-width="auto"`; the wide table's wrapper keeps `data-sphinx-preview-wide`.
- The two Mermaid diagrams are embedded as two `data:image/svg+xml` images (`img.myst-mermaid-image`);
  the Vega-Lite chart and the Vega chart are embedded as two inline `.myst-vega-view > svg` (no
  chart `img`, no hover box element, no script).
- In the Integrated Browser: the two Mermaid images are loaded (`complete`, `naturalWidth` above 0)
  and the two chart `svg` have a box; the wide table's width equals its width in Studio within 2 px,
  it is wider than a paragraph, and its right edge is inside the view (no sideways scroll of the
  page).
- No chart hover box shows in Studio on camera: the pointer rests right of every chart, and none is
  shown at the start and after each Studio scroll.
- `platform-report.md` on disk is byte for byte `stage/platform-report.md`.

## Review notes

Values below are measured by the take (`check.json`, the take's notes) on Windows.

- **Measured times of the take.** Filmed 18.076 s, retimed to 18.0 s (playback rate 1.004, inside
  0.77 to 1.3); raw screencast 28.3 fps, 512 frames, 30 fps after retiming. The click on Export at
  6.0 s, the save dialog at 6.3 s, Enter at 7.0 s, the palette at 7.6 s, the browser on screen from
  9.3 s, the address entered at 9.4 s, the page shown at 10.0 s, the zoom at 10.2 s (held to 17.0 s), the
  browser's picture changing at 11.0 s (a short step of the first scroll), 12.0 s (the wide table) and
  14.1 s (the diagrams), the end at 18.0 s.
- **Mark times.** The render draws each mark at the times of its Mark row above (mark 1 from 12.0
  to 13.2 s, mark 2 from 14.2 to 15.2 s, mark 3 from 15.4 to 16.6 s) and takes only the mark's
  rectangle from the take. The committed take logged other times: 11.87 to 13.08 s, 14.07 to
  15.27 s and 15.47 to 16.66 s of its 18.076 filmed seconds. Marks 1 and 2 were moved after the
  take, by a render, so that each starts after its cut. The scenario now calls the marks at the
  Mark rows' times, so a retake logs those.
- **Key frames.** `top` (0.4 s: the heading and the first card grid, Cream, reading mode), `wide-table`
  (2.1 s: the 16-column table broken out of the 720 px column, centred, the sticky band above),
  `diagrams` (3.6 s: the flowchart and the bar chart drawn), `save-dialog` (6.3 s: the save dialog
  proposing `platform-report.html`, the Export tooltip), `browser-opened` (9.2 s: the filmed picture
  still shows the palette with "Open Integrated Browser" typed; the browser appears at 9.3 s),
  `exported` (10.0 s: the exported
  page at its top in the Integrated Browser), `03-zoomed`, `04-mark-1`, `05-mark-2` and `06-mark-3`
  (the zoom and the three marks, each on its block). Not checked by the author: motion, rhythm, the
  loop as watched.
- **Length past 12 s.** Three beats: the scroll through the page (about 6 s), the export and the
  browser opening (4 s), the same page with three marks (8 s). The kit allows up to 30 s since the
  CR `clip-the-advanced-renderings-tour` (kit and recipe), which this CR follows
  (`depends.json`); this CR makes no kit change of its own.
- **What changes from the merged export-html clip.** The theme: Cream, the default, instead of a
  forced Dark (the clip no longer shows that a forced theme is kept, only that the page's theme
  is). The tab set and the click on "Release" are gone (the clip no longer shows tabs working
  without JavaScript). The stage (the old team handbook page) is replaced by `platform-report.md`. The length
  goes from 12.0 to 18.0 s, two captions become three, the two marks become three. The check now
  wants `cream` and `auto`, the breakout and the Vega charts. The tests that read the shipped clip
  (`clip-kit/lib/storyboard.test.mjs` "the shipped export-html clip.md...", `check.test.mjs`) and
  the GIF's alt text in `docs/user/toolbar.md` ("From a page in the Dark theme ... a click on a tab
  shows its panel") are updated in the same PR. `test/site/siteClips.test.ts` keeps working: the
  file names stay `export-html.*`.
- **Why Auto width and a narrower column.** Studio's default width mode is Margin
  (`src/core/state/previewViewPreferences.ts`), where a wide table scrolls sideways inside its box;
  only Auto lets it break out and stay centred (`docs/user/wide-tables.md`,
  `src/page/modules/widthMode.ts`). The default column is 960 px (`preview.maxContentWidth`), close
  to the editor's width in a 1280 px window, so the clip sets 720 px: the breakout is then plainly
  visible. Short number columns stay on one line, so 16 columns force the breakout; the trial
  checks the table fits the editor without its own sideways scroll and drops month columns if not.
  Measured: the wide table is 887 px wide in Studio and 887 px in the browser (equal within 0.01
  px), the text column (a paragraph) 564 px, in a view 1160 px wide; no month column was dropped,
  the table has no sideways scroll of its own, and the on-call table (200 px) stays inside the
  column.
- **Why the export keeps that layout.** The export keeps the root attributes
  `data-sphinx-preview-theme-mode` and `data-sphinx-preview-width` and the wrapper's
  `data-sphinx-preview-wide` with its inline breakout width (`src/core/export/exportSnapshot.ts`,
  `src/core/export/exportContent.ts`; "The file keeps the preview's theme ..., content width and
  width mode" in `docs/user/toolbar.md`). The breakout is frozen in pixels, so the browser must be
  at least as wide as Studio's view: the browser opens as a tab of the same editor group, full
  width; the check compares the two widths.
- **Diagrams and charts in the file.** Mermaid renders in the preview as an `<img>` with a `data:`
  SVG source, and the export keeps a `data:` image as it is (`embedImages` in
  `src/core/export/exportContent.ts`). A Vega chart renders as a live inline
  `.myst-vega-view > svg`, which the export keeps as it is, with its gradient references made local
  (`takeExportSnapshot`, `src/page/modules/exportSnapshot.ts`); see "Local images and the Mermaid,
  PlantUML and Vega diagrams are embedded" in `docs/user/toolbar.md`. The file has no script, so
  nothing is drawn again in the browser and a chart has no hover detail there: the drawings are the
  ones Studio drew, in the Cream colours.
- **The chart hover detail.** In Studio a Vega-Lite mark under the pointer shows its fields in a
  small box. The pointer rests right of every chart and never crosses one while Studio is on screen,
  so no box is filmed; `setup` checks that every chart ends left of the pointer and `run` checks that
  no box is shown after each Studio scroll.
- **One visible difference: "Chart source".** The preview hides a chart's source block and the
  exported sheet shows it, closed (`src/core/preview/styles/contentBlockStyles.ts`,
  `src/core/export/exportStyles.ts`, SwRS-MDOKFSTUDIO-DIAG-121). So the browser has a "Chart source"
  line under a chart that Studio does not show; under the bar chart it sits partly behind the
  caption. A diagram has its "Diagram source" line in both.
- **Scrolling.** The scroll is a CDP mouse wheel at the pointer (`t.page.mouse.wheel` in Studio,
  the browser page's `mouse.wheel` in the Integrated Browser), in small steps. The kit has no
  scroll helper and logs no wheel event. Both scrolls used the wheel (`scrollStudio` and
  `scrollBrowser` are `wheel` in the take's notes); the fallback, a smooth `scrollTo` in the page,
  was not needed. In Studio the clip shows a smooth scroll. In the browser it does not: the filmed
  window sent very few new frames for the browser's scrolls (of the take's 512 frames only three come
  after 11 s of it, at 11.01, 12.05 and 14.13 s of the take: a position partway through the first
  scroll, then the wide table, then the diagrams). So in the clip the first browser scroll shows as
  two steps, a short step at 11.0 s then a cut at 12.0 s, and the second as one cut at 14.1 s. Marks 1
  and 2 start after their cut, so no outline is drawn over the wrong block. For the owner: keep the
  cuts, or ask for a follow-up in the clip kit that films the browser's page itself.
- **The sticky heading band.** While Studio scrolls, its sticky band shows the current heading at
  the top of the view. It is Studio's reading aid, outside the page's content, so the exported
  file has none: the browser part does not show it. The captions say "same page", not "same
  window".
- The command palette part (about 2 s) stays the slowest beat; option for the owner, as in the
  merged clip: open the Integrated Browser off camera and only reload it after the export.
- Studio's information message "Exported to `platform-report.html`." pauses the Integrated
  Browser while it shows; `run` dismisses it after the save, as in the merged clip.
- The Simple Browser is not in the desktop command palette of VS Code 1.147.0 and opens the
  Integrated Browser, so the clip films the Integrated Browser. With `files.simpleDialog.enable`
  on, the save dialog is a VS Code input; without it, the system dialog is outside the filmed page
  and the take would hang. The address bar shows `localhost:5170`: no personal path. The take confirms a thin strip of the
  title bar at the top of the zoomed browser frames (`03-zoomed` to `06-mark-3`).
- **The GIF budget** (3 MB): scrolling changes most of the frame, unlike the merged clip (1.49 MB at
  12 s). The recipe's ladder applies; if none fits, the scroll in
  Studio is shortened (back to this file), never shipped heavier. The render used ladder step 0
  (12 fps, 960 px, 128 colours): 3,071,217 bytes (2.93 MB), under the 3 MB limit (`check.json`),
  so beat 1 was not shortened.
- The take runs with `CLIP_SCRATCH` set to a folder without the user name (the save dialog shows
  the workspace path), as in the merged scenario.
- The badge `⇧⌘P` is drawn as one keycap, as in the merged clip.
- The clip ends with the browser open, zoomed out, and starts on Studio at the top: the loop seam
  relies on the kit's return to the start, as in the merged clip.
