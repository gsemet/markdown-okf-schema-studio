---
title: Demo video storyboard
status: draft
date: 2026-11-04
---

# Demo video storyboard

**This is the live storyboard.** The video is built from this file: edit it directly, save, and ask
for a new render. Its titles, captions, callouts and times are exactly those of the video.

:::{note} How to write the effects
- `**bold**` in a title or a caption: the word takes the accent colour, orange `#FFB06A`.
- A dash `-` in a row: that layer is not used in this panel. Fill it in to add the text.
- Keep captions to 3 to 6 words, so that they read in one glance.
- **Time** is free: a panel plays its whole filmed action, sped up or slowed down to fit. Keep the
  panels end to end, and keep the *Filmed length* in mind: under about 0.8 of it, the action rushes.
- Rows marked *(filmed)* are in the footage: changing them means a new take, not just a new render.
:::

| Layer | Where it appears | Look |
| --- | --- | --- |
| Title | Green cards only | White, bold, large; words appear one after the other |
| Subtitle | Green cards only | Pale green `#D6EBEE`, under an orange line |
| Caption | Over VS Code, bottom centre | Green pill, white semi-bold text, words spring up one by one |
| Callout | Over VS Code, at the corner set in **Callout place** (`bottom right`, `bottom left`) | Orange pill, white bold text, just after the last click of the panel |
| Marks | Over VS Code, on what changed | Orange outline, in the page and in the raw text (filmed positions) |

The video is full frame and has three parts:

| Part | Panels | Time | Length |
| --- | --- | --- | --- |
| Discover: from raw text to page | 1 to 3 | 0 to 10 s | 10 s |
| Edit side by side with the raw text | 3 to 10 | 6 to 43.5 s | 37.5 s |
| Zoom on a few features | 11 to 13 | 43.5 to 57.5 s | 14 s |

The pictures are frames of the last render, written by `kit/panels.py`.
The music is "Tutorial Music Informative Clean Minimalist Explainer Tech Background" by alexrockbeat
(Pixabay Content License), cut to 57.5 seconds with a 3-second fade at the end.

## 1. Opening card

![Panel 1](images/panel-01.png)

| Field | Content |
| --- | --- |
| Time | 0.0 to 2.5 s |
| Title | Markdown OKF Schema **Studio** |
| Subtitle | Read, review and edit **rich Markdown** in VS Code |

## 2. Raw Markdown

![Panel 2](images/panel-02.png)

| Field | Content |
| --- | --- |
| Time | 2.5 to 6.0 s |
| Filmed length | 4.0 s |
| Message | 1 |
| Shot *(filmed)* | The post-mortem in the built-in text editor, alone in the window; slow scroll |
| Caption | Your **agent** wrote a report or a spec in raw Markdown |
| Callout | - |
| Callout place | - |

## 3. The switch to Studio

![Panel 3](images/panel-03.png)

| Field | Content |
| --- | --- |
| Time | 6.0 to 10.0 s |
| Filmed length | 4.8 s |
| Message | 1 |
| Shot *(filmed)* | Click on Open Preview: the page appears beside the same text |
| Caption | Open Studio for an **elegant Markdown experience** |
| Callout | No configuration |
| Callout place | bottom right |

## 4. Page and text together

![Panel 4](images/panel-04.png)

| Field | Content |
| --- | --- |
| Time | 10.0 to 13.0 s |
| Filmed length | 3.2 s |
| Message | 1 |
| Shot *(filmed)* | Scroll both views together               |
| Caption | Page and text **move together** |
| Callout | - |
| Callout place | - |

## 5. Edit a word

![Panel 5](images/panel-05.png)

| Field | Content |
| --- | --- |
| Time | 13.0 to 18.5 s |
| Filmed length | 6.8 s |
| Message | 2 |
| Shot *(filmed)* | Click the pencil, then the summary; "one checkout in four" becomes "three"; Done; marks in page and text |
| Caption | **Edits stay in sync** between raw and preview |
| Callout | - |
| Callout place | - |

## 6. Edit a table cell

![Panel 6](images/panel-06.png)

| Field | Content |
| --- | --- |
| Time | 18.5 to 24.5 s |
| Filmed length | 6.5 s |
| Message | 2 |
| Shot *(filmed)* | Click a cell of the table: "Pool raised" becomes "Pool raised to 200"; Done; marks in page and text |
| Caption | Change an **individual table cell** in place |
| Callout | - |
| Callout place | - |

## 7. Type in the raw text

![Panel 7](images/panel-07.png)

| Field | Content |
| --- | --- |
| Time | 24.5 to 29.5 s |
| Filmed length | 5.4 s |
| Message | 2 |
| Shot *(filmed)* | In the raw text, add "(no backoff)" to a line of the diagram; the diagram redraws beside it |
| Caption | Live update of **mermaid or plantuml** diagram |
| Callout | - |
| Callout place | - |

## 8. Change a chart from the raw text

![Panel 8](images/panel-08.png)

| Field | Content |
| --- | --- |
| Time | 29.5 to 34.5 s |
| Filmed length | 4.5 s |
| Message | 2 |
| Shot *(filmed)* | In the raw text, the peak 31 becomes 44: the chart redraws at once, beside it |
| Caption | **Vega and Vega-lite charts** also supported |
| Callout | - |
| Callout place | - |

## 9. Change the highlighted lines from the raw text

![Panel 9](images/panel-09.png)

| Field | Content |
| --- | --- |
| Time | 34.5 to 39.5 s |
| Filmed length | 4.9 s |
| Message | 1 |
| Shot *(filmed)* | In the raw text, `:emphasize-lines:` goes from 3-5 to 2-6: the highlight moves at once in the page |
| Caption | Support advanced **Code blocks** with line highlights |
| Callout | - |
| Callout place | - |

## 10. Make a decision

![Panel 10](images/panel-10.png)

| Field | Content |
| --- | --- |
| Time | 39.5 to 43.5 s |
| Filmed length | 4.1 s |
| Message | 3 |
| Shot *(filmed)* | "Which fix do we ship first?": a click on the second option moves the `(x)` in the raw text |
| Caption | **Make a decision** in the page with radio choice and tick box |
| Callout | Saved in the file |
| Callout place | bottom right |

## 11. Front matter and OKF-Schema

![Panel 11](images/panel-11.png)

| Field | Content |
| --- | --- |
| Time | 43.5 to 48.5 s |
| Filmed length | 6.0 s |
| Message | 1 |
| Shot *(filmed)* | The page alone, zoom on the properties table. `severity: SEV-9` is refused by the schema: the error badge shows; click the value, pick SEV-1 from the allowed list; the badge goes |
| Caption | Frontmatter fields description and validation with **OKF-Schema** |
| Callout | Allowed: SEV-1, SEV-2, SEV-3 |
| Callout place | bottom right |

## 12. Wide table

![Panel 12](images/panel-12.png)

| Field | Content |
| --- | --- |
| Time | 48.5 to 54.5 s |
| Filmed length | 6.5 s |
| Message | 1 |
| Shot *(filmed)* | The page alone; slow scroll to an 11-column table cut by the column; a click on Width lets it out |
| Caption | Wide tables and figures can **break the margin** for readability |
| Callout | Width: Auto |
| Callout place | bottom right |

## 13. End card

![Panel 13](images/panel-13.png)

| Field | Content |
| --- | --- |
| Time | 54.5 to 57.5 s |
| Title | Markdown OKF Schema **Studio** |
| Subtitle | Free on the VS Code Marketplace |
| Link box | marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio |
| Orange line | Works with your coding agent |
| Footnote | Captured in VS Code with the real extension. Edited with Remotion. |

## The document shown in the window

Its full text is in [demo-document.md](stage/demo-document.md): edit it there, open it in the preview to
see what the video will show, then ask for a new take.
