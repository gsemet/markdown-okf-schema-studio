---
title: Feature clip advanced-renderings-tour
status: draft for the owner's review
date: 2026-11-25
---

# Feature clip: advanced-renderings-tour

**This is the live storyboard.** The clip is built from this file: edit any row marked
*(on screen)*, save, and run `just clip advanced-renderings-tour render`, then `check`. Rows marked
*(filmed)* describe the footage of the take: changing them means a new take. `**bold**` in a text
takes the orange accent. The owner reviews this file and the clip in the pull request.

The clip is one continuous shot of one design note in reading mode: a zoom on the page, then six
orange marks in turn, one per renderer, each named by its own caption: Mermaid, PlantUML,
Vega-Lite, Vega, math and SVG. The page scrolls once in the middle, under the zoom, and scrolls
back to the top at the end for the loop. It shows six texts in turn.

## Clip

| Field | Content |
| --- | --- |
| Length | 16.0 s |
| Size *(on screen)* | 1280x720 16:9 |
| Frame rate *(on screen)* | 15 fps |
| Outputs | silent, loops; MP4 (X, release), WebM (docs site), GIF 960 px (release notes, docs page) |
| Cards | none |
| Logo | top right |
| Setting filmed | none: every setting at its default (PlantUML on the built-in engine, `plantuml.useJar` off) |
| Filmed on | Windows, VS Code 1.147.0, extension 1.12.1 VSIX built from the branch |
| Stage | `stage/search-design.md` (Studio, the whole window, reading mode, Cream): a heading, a sentence, a Mermaid flowchart, a PlantUML sequence and a Vega-Lite line chart in the first view; a `Capacity` heading, a Vega bar chart, a display equation and an inline SVG drawing in the second view |

Off camera (`setup`): reading mode, the page in Cream (the default of a fresh workspace), the
toolbar left as a fresh workspace has it, the page scrolled to the top, all four drawings rendered
(`data-render-state="rendered"` on the Mermaid, PlantUML and both Vega blocks) and the pointer
parked off the page content, so frame 0 shows no hover. The way to scroll is tried from there and
the page put back at the top.

## 1. Mermaid

![Mark 1 around the Mermaid flowchart, with its caption](frames/04-mark-1.png)

| Field | Content |
| --- | --- |
| Time | 0 to 3.0 s (zoom from 0.4 s, in by 1.0 s) |
| Shot *(filmed)* | Studio on `search-design.md` in Cream, at the top. The clip zooms on the content column (the same rect for the whole tour, about 1.3x, at most 2x) that holds the flowchart, the sequence and the line chart. |
| Zoom | tour, hold to 15.0 s |
| Mark 1 *(on screen)* | Orange outline around the Mermaid flowchart, 1.0 to 2.9 s |
| Text 1 *(on screen)* | **Mermaid** diagrams, drawn in the page |

## 2. PlantUML

![Mark 2 around the PlantUML sequence, drawn with no Java](frames/05-mark-2.png)

| Field | Content |
| --- | --- |
| Time | 3.0 to 5.2 s |
| Shot *(filmed)* | The same view, zoomed: the PlantUML sequence (Reader, Search, Index, three messages), drawn by the built-in engine. |
| Mark 2 *(on screen)* | Orange outline around the PlantUML sequence, 3.0 to 5.1 s |
| Text 2 *(on screen)* | **PlantUML** built in, with no Java |

## 3. Vega-Lite

![Mark 3 around the Vega-Lite line chart](frames/06-mark-3.png)

| Field | Content |
| --- | --- |
| Time | 5.2 to 7.4 s |
| Shot *(filmed)* | The same view, zoomed: the Vega-Lite line chart of the weekly p95 latency, five points. |
| Mark 3 *(on screen)* | Orange outline around the Vega-Lite line chart, 5.2 to 7.3 s |
| Text 3 *(on screen)* | **Vega-Lite** charts from a few lines |

## 4. Vega

![The middle of the zoom hold, 8.0 s: the second view as the scroll ends, before mark 4](frames/03-zoomed.png)

![Mark 4 around the Vega bar chart, after the scroll](frames/07-mark-4.png)

| Field | Content |
| --- | --- |
| Time | 7.4 to 10.0 s (scroll 7.4 to 8.2 s) |
| Shot *(filmed)* | Under the zoom, the page scrolls down smoothly (eased scroll steps in the preview frame) until the `Capacity` heading is at the top of the zoomed rect; the Vega bar chart (three regions), the equation and the SVG drawing come into view. |
| Mark 4 *(on screen)* | Orange outline around the Vega bar chart, 8.2 to 9.9 s |
| Text 4 *(on screen)* | Full **Vega** specs for custom charts |

## 5. Math

![Mark 5 around the display equation typeset by KaTeX](frames/08-mark-5.png)

| Field | Content |
| --- | --- |
| Time | 10.0 to 12.2 s |
| Shot *(filmed)* | The same view, zoomed: the display equation, typeset by KaTeX. |
| Mark 5 *(on screen)* | Orange outline around the display equation, 10.0 to 12.1 s |
| Text 5 *(on screen)* | **Math** typeset by KaTeX |

## 6. SVG, then back to the top

![Mark 6 around the inline SVG drawing in the page colours](frames/09-mark-6.png)

| Field | Content |
| --- | --- |
| Time | 12.2 to 16.0 s (scroll back 14.4 to 15.0 s, zoom out 15.0 to 15.6 s, then still) |
| Shot *(filmed)* | The same view, zoomed: the inline SVG drawing (Box, Service, Index) in the page colours. Then the page scrolls back to the top under the zoom, the zoom goes out, and the last frames show the page as frame 0. |
| Mark 6 *(on screen)* | Orange outline around the SVG drawing, 12.2 to 14.3 s |
| Text 6 *(on screen)* | **SVG** drawn in the page colours |

Expected result, the scenario's check (visible state, read from the preview; the file is never
changed):

- At the start and before each mark, all six renderings are drawn: `.myst-mermaid-diagram`,
  `.myst-plantuml-diagram` and both `.myst-vega-diagram` blocks (`data-myst-chart-kind`
  `vega-lite` and `vega`) have `data-render-state="rendered"` and a drawing (an image for Mermaid and PlantUML, the live `svg` of `.myst-vega-view` for the charts); the `.math-display`
  block holds a `.katex` element; the `.myst-svg-figure` holds an `svg`.
- No PlantUML block shows an error (`.myst-plantuml-error`): the built-in engine drew it, with no
  Java and no JAR on the filming machine.
- Each mark's rect is the box of its rendering, read after the scroll settled, inside the zoom rect.
- `search-design.md` on disk is byte for byte `stage/search-design.md`.

## Review notes

- **PlantUML needs no Java here.** Studio's default PlantUML engine is the official JavaScript
  build bundled into the page (`@plantuml/core`): no Java, no JAR, no process, no network
  (`markdownOkfSchemaStudio.plantuml.useJar` is off by default). The kit's profile does not set it,
  so the filming machine renders the sequence as any user sees it. Java and a JAR are only for the
  opt-in `useJar` pipeline, which this clip does not film. Sources: `src/core/configuration/plantUmlConfiguration.ts`
  (`resolvePlantUmlEngine`), `package.json` (the `plantuml.useJar` description), `docs/user/plantuml.md`,
  the writing skill's "What renders" table ("plantuml fence (built in, no Java)").
- **The list of renderers**, from the writing skill (`skills/writing-for-markdown-okf-schema-studio/SKILL.md`,
  "What renders": Diagrams, Charts, Math, SVG pictures) and `src/`: Mermaid
  (`src/page/modules/mermaidPreview.ts`), PlantUML (`src/page/modules/plantumlPreview.ts`), Vega-Lite
  and Vega (`src/core/render/chartData.ts`, `src/page/modules/vegaPreview.ts`), math with KaTeX
  (`src/core/render/mathRenderer.ts`), inline SVG (`src/core/render/svgPictures.ts`). Graphviz is
  not rendered by Studio (the name appears only in the raw-copy directive list of
  `src/core/mapping/rawCopyScan.ts`), so it is not in the tour. The `{uml} file.puml` and
  `{mermaid}` directive forms, and chart data read from a CSV file, draw with the same engines and
  are not filmed.
- **The length.** The clip runs 16 s, past the usual 12 s, which the kit allows up to 30 s since this
  change (the six beats need about 2 s each, a scroll and the return to the top).
- **Six captions, not two.** The kit allows one caption per section and any number of sections;
  the recipe's usual two captions are not enough to name six renderers, so each beat names its
  own.
- **The scroll under the zoom.** The zoom is one fixed rect of the window, so the page may scroll
  under it; each mark is placed after its scroll settled and no mark is shown during a scroll.
  The take used the `scrollTo` way: the CDP mouse wheel (`t.page.mouse.wheel`) over the preview did not
  move the page in the trial, so the scenario scrolls the preview frame in small eased steps, 50 ms
  apart (the same picture on screen), over 0.7 s down and 0.6 s back. The way is tried off camera:
  tried during the take, it delayed the scroll and mark 4 came in over a moving page.
- **Fit.** The trial found that the window of the take (1169x660 CSS pixels) did not hold the three
  renderings of the first view at the drafted sizes, so the stage was made smaller, in this order:
  the Vega-Lite `height` 90 to 30 (x axis labels horizontal), the Vega `height` 100 to 80, the SVG
  `width` 480 to 300, and the PlantUML sequence with `hide footbox`, `scale 0.75` and a `participant`
  instead of an `actor`. Studio now sizes chart text with the page text, which made the line chart
  taller and put the bottom of its mark under the caption, so its x axis has no title
  (`"title": null`; the labels W1 to W5 say the weeks). At height 80 the y tick labels of the Vega
  bar chart overlapped, so its left axis asks for fewer ticks (`"tickCount": 3`). Each mark is
  inside the zoom rect (about 1.3x) and above the caption.
- **The loop seam.** The page is back at the top and unzoomed for the last 0.4 s, so the last frame
  matches frame 0 (the kit wants an SSIM of at least 0.98 and below 1.0).
- **GIF budget.** The GIF used the first step of the kit's ladder (12 fps, 960 px, 128 colours) and
  fits in 3 MB (`check.json`).
- The drawings are in Cream only: the theme switch is the `theme-switch` clip's story.
