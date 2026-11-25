---
title: Feature clip theme-switch
status: draft
date: 2026-11-25
---

# Feature clip: theme-switch

**This is the live storyboard.** The clip is built from this file: edit any row marked
*(on screen)*, save, and run `just clip theme-switch render`, then `check`. Rows marked *(filmed)*
describe the footage of the take: changing them means a new take. `**bold**` in a text takes the
orange accent.

The clip is one continuous shot: four clicks on the Theme button, then a zoom on the diagram and the
chart. It shows two texts in turn.

## Clip

| Field | Content |
| --- | --- |
| Length | 10.9 s |
| Size *(on screen)* | 1280x720 16:9 |
| Frame rate *(on screen)* | 15 fps |
| Outputs | silent, loops; MP4 (X, release), WebM (docs site), GIF 960 px (release notes, docs page) |
| Cards | none |
| Logo | top right |
| Setting filmed | none: every setting at its default (the theme mode is a view choice, set off camera) |
| Filmed on | Windows, VS Code 1.147.0, extension 1.12.1 VSIX built from the branch |
| Stage | `stage/handbook.md` (Studio, the whole window, reading mode): a heading, a sentence, a `tip` admonition, a Mermaid flowchart and a Vega-Lite bar chart, all in view |

Off camera (`setup`): the toolbar expanded (a new workspace starts collapsed) and reading mode; the
page is in Cream, the default, so frame 0 is Cream and no click is made off camera. The button
cycles current, Dark, White, Cream.

## 1. Four clicks, four palettes

![The whole page, the admonition, the diagram and the chart in the Dark theme after the second click](frames/dark.png)

![The page in the White theme after the third click](frames/white.png)

![The page back in the Cream theme after the fourth click, the pointer off the toolbar](frames/cream.png)

| Field | Content |
| --- | --- |
| Time | 0 to 4.6 s (clicks at 0.9, 1.7, 2.5 and 3.3 s: current, Dark, White, Cream; each fade about 0.2 s) |
| Shot *(filmed)* | Studio on `handbook.md` in Cream. The pointer moves to the Theme button of row 2 and clicks four times, 0.8 s apart: the whole page, the admonition, the diagram and the chart turn to the current VS Code theme, to Dark, to White, and back to Cream. The pointer then moves off the toolbar. |
| Text 1 *(on screen)* | One click turns the **whole page** to another theme |

## 2. Zoom on the diagram and the chart

![Mark 1 around the flowchart in the Cream theme](frames/04-mark-1.png)

![Mark 2 around the bar chart in the Cream theme](frames/05-mark-2.png)

| Field | Content |
| --- | --- |
| Time | 4.6 to 10.9 s (zoom from 4.6 s, held to 9.9 s, then back to the start for the loop) |
| Shot *(filmed)* | Zoom (at most 2x) on the flowchart and the bar chart, in Cream: the boxes, arrows, bars and axis labels in the Cream palette. |
| Zoom | charts, hold to 9.9 s |
| Mark 1 *(on screen)* | Orange outline around the flowchart, 5.2 to 7.0 s |
| Mark 2 *(on screen)* | Orange outline around the bar chart, 7.0 to 8.8 s |
| Text 2 *(on screen)* | Diagrams and charts **follow** the theme |

Expected result, the scenario's check (visible state, read from the preview; the file is never
changed):

- After the four clicks the page's theme mode is current, Dark, White, then Cream (the theme
  button's label reads "Cream theme (click for current theme)" at the end).
- After each click, the Mermaid diagram and the Vega-Lite chart were drawn again: the `src` of each
  drawing differs from the one of the mode before.
- `handbook.md` on disk is byte for byte `stage/handbook.md`.

## Review notes

- The diagram and the chart are drawn again after each switch; the take waits for both new
  drawings before the next step, so the zoom never shows the old colours.
- The toolbar tooltip slides in on hover; the pointer leaves the button after the fourth click so it
  does not stay in the zoom.
- The current VS Code theme, the kit's Default Light Modern, shows for 0.8 s: it is close to White.
- The loop seam: the first version filmed (Dark, White, Cream, two clicks) ended in another theme
  than it started in, and the kit's seam check refused it (SSIM 0.97717, the limit is 0.98). The
  rendered version starts and ends in Cream with four clicks (current, Dark, White, Cream), and its
  seam SSIM is 0.99409 (extension 1.12.1 VSIX, VS Code 1.147.0).
