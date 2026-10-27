---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-071
uuid: a9f9569e-ed65-496f-b34c-85ea4e039f07
title: README-style HTML renders like GitHub and shows its tag in edit mode
description: When a document holds README-style HTML (div and p with align, br,
  img with width, height and alt, a around img, picture with colour-scheme
  sources, sub, sup, kbd), the preview SHALL render those elements like GitHub,
  keep Markdown after a blank line inside an HTML block rendered, and, in edit
  mode, show each HTML block as an admonition-like block titled with its literal
  opening tag, without any script, event handler or style the sanitizer does not
  already keep.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/htmlBlockStyles.ts
- src/core/render/mystRawHtml.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/core/render/mystRawHtml.test.ts
- test/integration/readmeHtmlWindow.ts
---

## README-style HTML renders like GitHub and shows its tag in edit mode

### Normative behavior

When a document holds README-style HTML (div and p with align, br, img with width, height and alt, a around img, picture with colour-scheme sources, sub, sup, kbd), the preview SHALL render those elements like GitHub, keep Markdown after a blank line inside an HTML block rendered, and, in edit mode, show each HTML block as an admonition-like block titled with its literal opening tag, without any script, event handler or style the sanitizer does not already keep.

### Scenario (nominal): README header

- GIVEN a document whose first block is `<div align="center">`, then after a blank line an `<img src width height alt>`, a Markdown heading and a Markdown badge row, then `</div>`
- WHEN the document is rendered
- THEN the preview holds one `div` with `align="center"` whose content is the image at its width and height, the heading and the badge row, each Markdown block rendered as Markdown

### Scenario (nominal): Elements kept

| Source | Rendered as |
| --- | --- |
| `<p align="center">` | a `p` with `align` center (also left, right, justify) |
| `<br>`, `<sub>`, `<sup>`, `<kbd>` | the same element |
| `<a href><img></a>` | a link around the image |
| `<picture>` with `<source media="(prefers-color-scheme: dark)" srcset>` and a fallback `<img>` | the dark image in a dark preview, the fallback image otherwise, following the preview theme and not the system |
| `<details><summary>` | an openable details block |

### Scenario (nominal): Edit mode

- GIVEN edit mode is on
- WHEN a `div`, `p` or `picture` block is rendered
- THEN it is shown as an admonition-like block titled with its literal opening tag in code font, for example `<div align="center">` (shortened with an ellipsis when long), and a click on it edits the raw source lines of the block only; read mode shows no frame and no title

### Scenario (refusal): Nothing active survives

- GIVEN raw HTML with `<script>`, `<iframe>`, an `onclick` or `onerror` attribute, a `style` or `class` attribute, a `javascript:` link or an unknown element
- WHEN the document is rendered
- THEN the script, iframe and unknown elements are dropped (with their content for script, style and iframe) and no event handler, style, class or script URL reaches the page; the sanitizer allows no attribute it did not already allow

### Related requirements

- SwRS-MDOKFSTUDIO-CORE-003: the source lines of a block, which the HTML block shares.
- SwRS-MDOKFSTUDIO-GFM-031: raw HTML tables, which keep their own path.
- SwRS-MDOKFSTUDIO-REVIEW-003: the literal-tag title of a comment block in edit mode.

### Verification notes

- Method: test/core/render/mystRawHtml.test.ts (structure, Markdown inside an HTML block, source lines, picture themes, refusals), test/core/preview/previewStyles.test.ts (align, theme and edit-mode frame rules).
- Method: real-window scenario test/integration/readmeHtmlWindow.ts (the painted layout in read mode, the titles in edit mode, a click that edits the block source).
- Criteria: the rendered tree and CSS match the table above, no unsafe attribute or element survives, and the painted page shows a centred image and heading.
