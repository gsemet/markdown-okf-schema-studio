---
title: Feature clip figure-editor
status: draft
date: 2026-11-25
---

# Feature clip: figure-editor

**This is the live storyboard.** The clip is built from this file: edit any row marked
*(on screen)*, save, and run `just clip figure-editor render`, then `check`. Rows marked
*(filmed)* describe the take: changing them means a new take. The text of an *(on screen)* row is
the clip's exact text (`**bold**` takes the orange accent).

The clip is one continuous shot: the Edit figure button, the form filled from the keyboard, Apply,
then a zoom on the rewritten directive and on the figure drawn in its new place. It shows two texts
in turn.

## Clip

| Field | Content |
| --- | --- |
| Length | 12.0 s |
| Size *(on screen)* | 1280x720 16:9 |
| Frame rate *(on screen)* | 15 fps |
| Outputs | silent, loops; MP4 (X, release), WebM (docs site), GIF 960 px (release notes, docs page) |
| Cards | none |
| Logo | top right |
| Setting filmed | none (default palette mode and Cream theme; edit mode is set off camera) |
| Filmed on | Windows, VS Code 1.147.0, extension 1.12.1 VSIX built from the branch |
| Stage | `stage/harbour-guide.md` (Studio, the whole window, edit mode): a heading, a sentence, a `{figure}` of `stage/harbour-light.svg` (400x240, centred, an alt text and a one-line caption, no other option) and a paragraph of three lines under it |

Off camera (`setup`): edit mode on, no block editor open, the pointer parked in the right margin,
away from the figure (no Edit figure button and no hover outline at frame 0).

## 1. Edit figure, fill the form

![The pointer on the figure: the Edit figure button shows at its top right](frames/button.png)

![The Figure form above the text box, filled from the directive: Source, Alt text and Caption as they were](frames/form.png)

![The four new values in the form, just before Enter: the new caption, Width 40%, Align Right and Name fig-harbour-light](frames/filled.png)

| Field | Content |
| --- | --- |
| Time | 0 to 6.0 s (pointer on the figure at 0.82 s, click on Edit figure at 1.61 s, the form shown by 2.0 s, the pointer in Caption and the picture `form` at 2.88 s, click in Caption at 2.90 s, all four values typed, the page scrolled by a wheel move and the picture `filled` at 5.27 s, Enter at 6.0 s) |
| Shot *(filmed)* | Studio in edit mode on `harbour-guide.md`. The pointer moves onto the figure: the Edit figure button shows at its top right. The pointer clicks it: the figure's text box opens with the edition palette and, between them, the Figure form (Source, Alt text, Caption, Legend, Width, Align, Name), filled from the directive. The pointer clicks in Caption, Ctrl+A selects its text and it is replaced by "Harbour light at dusk, from the north pier.". Tab, Tab: Width gets "40%". Tab: Align is set to Right from the keyboard (its list is not opened). Tab: Name gets "fig-harbour-light". A pointer wheel move scrolls the page so the four fields show. Enter: the form closes and the text box holds the rewritten directive. |
| Text 1 *(on screen)* | **Edit figure** opens one form for the whole figure |

## 2. The directive, then the page

![Zoom on the text box and the paragraph under it after Apply](frames/03-zoomed.png)

![Mark 1 on the three new option lines under the kept alt line](frames/04-mark-1.png)

![The figure drawn at 40% floating right after the save chord, the paragraph wrapping on its left](frames/rendered.png)

![Mark 2 on the rendered figure and its caption](frames/05-mark-2.png)

| Field | Content |
| --- | --- |
| Time | 6.0 to 12.0 s (zoom from 6.75 s, held to 11.0 s; save chord at 8.6 s; then back to the start for the loop) |
| Shot *(filmed)* | Zoom (at most 2x) on the text box and the paragraph under it: the directive now has the lines `:width: 40%`, `:align: right` and `:name: fig-harbour-light` under the kept `:alt:` line, and the new caption. Save chord: the text box closes and the figure is drawn at 40% of the column, floating right, with the new caption; the paragraph wraps on its left. |
| Zoom | figure, hold to 11.0 s |
| Mark 1 *(on screen)* | Orange outline around the three new option lines in the text box, 7.0 to 8.2 s |
| Badge save *(on screen)* | Ctrl+Enter / ⌘Enter |
| Mark 2 *(on screen)* | Orange outline around the rendered figure and its caption, 9.2 to 10.8 s |
| Text 2 *(on screen)* | Apply writes the **options** into the file |

Expected result, the scenario's check: `harbour-guide.md` on disk (auto-save is on) is exactly this
text, followed by one newline:

```markdown
# Harbour guide

The north pier is open to walkers from dawn to dusk. Keep to the marked path.

:::{figure} harbour-light.svg
:alt: A lighthouse on a rock at dusk
:width: 40%
:align: right
:name: fig-harbour-light

Harbour light at dusk, from the north pier.
:::

The light was built in 1874 and still guides the fishing boats home. Its beam turns once every
ten seconds and reaches eighteen nautical miles on a clear night. The keeper's cottage beside it
is now a small museum, open on weekend afternoons from April to October.
```

And, read from the preview after the save chord:

- the `figure` has the class `align-right` and its image has `data-okf-width` `40%`;
- its id is `fig-harbour-light` and its caption reads "Harbour light at dusk, from the north pier.";
- no block editor is open; `harbour-light.svg` on disk is byte for byte the stage file.

## Review notes

- What the form writes comes from `applyValues` and `serializeFigure` in
  `src/page/modules/figureDirective.ts`: the opening line and the `:alt:` line are kept as read, the
  new options are appended in the order width, align, name, one blank line stays before the caption,
  and the edited caption replaces the body (SwRS-MDOKFSTUDIO-PALETTE-160). The expected text above
  is derived from that code; the take checks it in the text box and on disk.
- The button, the fields, their order and the keys come from `src/page/modules/figurePanel.ts` and
  `openFigurePanel` in `src/page/features/editorChrome.ts` (SwRS-MDOKFSTUDIO-PALETTE-153): the
  "Edit figure" button over a hovered figure in edit mode, the form named "Edit figure" inserted
  above the text box, Source focused first, Enter in a one-line field (Name) applies, Tab goes
  through Source, Browse..., Alt text, Caption, Legend, Width, Align, Name.
- Apply only rewrites the text box: the editor stays open and auto-save (400 ms) writes the file.
  The save chord closes the box so the page shows the figure in its new place
  (`docs/user/editing.md`, "Inline editing"). The rendering of width, alignment, caption and id is
  SwRS-MDOKFSTUDIO-MYST-031 (`src/core/directives/figure.ts`, `src/page/modules/figureSizes.ts`).
- Browse... is not filmed: it opens the system file dialog, outside the filmed page. The Source
  field is left as it is.
- Align is a `<select>`. Its open list may be drawn outside the screencast, so the clip sets it from
  the keyboard and never opens it. At the take the key "r" on the focused list picked Right (`alignBy`
  is `r` in the take's notes): no `ArrowDown` and no `selectOption` was needed.
- The click in Caption only puts the caret there: a click in a textarea does not select its text, so
  Ctrl+A (`ControlOrMeta+A` through `page.keyboard`, no badge, not a logged press) selects the
  field's text before the new caption is typed over it. The keys of the form (Tab, typed text,
  Enter) go through `page.keyboard`, without a badge, like the typed keys of the slash-menu-grid
  clip; only the save chord has a badge.
- After the click on Edit figure the pointer sits over a palette button and its tooltip would show:
  the pointer goes to Caption before the picture `form` is taken. After the save, the focus goes
  back to the figure and its Edit figure button shows as for a hover; a short pointer move out of
  the page and back to the margin (not drawn: the zoom hides it) makes the button go, as it does
  for a real pointer that leaves a figure.
- The rendered caption reads "Figure 1 Harbour light at dusk, from the north pier.": the page numbers
  the figure. The scenario checks the caption text without that number.
- The window is short (1169 x 660 CSS pixels): the Width, Align and Name fields lie below its bottom edge. After the
  last field is typed, a pointer wheel move (the pointer is over the form) scrolls the page so the four
  fields show in `filled`, above the caption bar. The scroll is a filmed action, not a script setting. `form`
  is taken before it and still cuts the three fields; the page stays scrolled until the save.
- The name is the figure's label: it becomes the figure's id, the target of a `{ref}`. No `{ref}` is
  filmed; the clip shows the `:name:` line and checks the id.
- The zoom must hold the text box before the save and the figure after it: `run` takes the union of
  the text box and the paragraph under it as the zoom rectangle. If the figure lands outside it at
  the trial, the rectangle is widened, never a second zoom.
- The Legend field stays empty: a legend would add a second paragraph and about 1 s of typing.
- The Name step is kept: the take played in 12.0 s, no step was dropped (figure-editor-Q8).
- The clip ends with the small floating figure and starts with the large centred one: the loop seam
  relies on the kit's return to the start.
- `01-selected` and `02-pasted` are the kit's fixed key frame names, both written at the save chord,
  and are not linked here.
- Measured by the take: filmed 11.95 s played in 12.0 s (playback rate 0.995); pointer on the figure
  with the button shown at 0.82 s, click on Edit figure at 1.61 s, picture `form` at 2.88 s, click in
  Caption at 2.90 s, picture `filled` at 5.27 s, zoom from 6.75 s, mark 1 from 7.02 to 8.20 s, save at
  8.61 s, picture `rendered` at 9.15 s, mark 2 from 9.22 to 10.81 s, unzoom at 11.02 s. The raw
  screencast runs at about 9 frames per second (`rawFps` of `check.json`): the pointer is drawn
  smooth by the kit, the typing and the page change by steps.
- The storyboard is reviewed in the pull request after the take (figure-editor-Q3). Not checked by
  the author: motion, rhythm, the loop as watched.
