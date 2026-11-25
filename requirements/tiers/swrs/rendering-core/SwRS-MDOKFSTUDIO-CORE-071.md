---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-071
uuid: a9f9569e-ed65-496f-b34c-85ea4e039f07
title: README-style HTML renders like GitHub and shows its tag in edit mode
description: 'When a document holds README-style HTML (div and p with align, br, img
  with width, height and alt, a around img, picture with colour-scheme sources, sub,
  sup, kbd), the preview SHALL render those elements like GitHub, keep Markdown after
  a blank line inside an HTML block rendered, and, in edit mode, show each HTML block
  as an admonition-like block titled with its literal opening tag, without any script,
  event handler or style the sanitizer does not already keep. The preview SHALL render
  a raw details element with an optional open attribute and a plain summary element
  as a collapsible section, and a kbd element without attributes as a key cap, and
  SHALL omit raw HTML outside the allow-list of tags and attributes.'
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
- StRS-MDOKFSTUDIO-GFM-002
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/htmlBlockStyles.ts
- src/core/render/mystBlockTransforms.ts
- src/core/render/mystRawHtml.ts
- src/core/render/mystRenderer.ts
tested_in_files:
- test/core/preview/previewStylesGutter.test.ts
- test/core/render/mystPaletteRendering.test.ts
- test/core/render/mystRawHtml.test.ts
- test/core/render/renderReq.gfm.requirements.test.ts
- test/core/render/renderReq.renderingCore.requirements.test.ts
- test/integration/readmeHtmlWindow.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-CORE-044
- SwRS-MDOKFSTUDIO-CORE-062
- SwRS-MDOKFSTUDIO-GFM-029
- SwRS-MDOKFSTUDIO-GFM-030
- SwRS-MDOKFSTUDIO-GFM-033
---

## README-style HTML renders like GitHub and shows its tag in edit mode

### Normative behavior

When a document holds README-style HTML (div and p with align, br, img with width, height and alt, a around img, picture with colour-scheme sources, sub, sup, kbd), the preview SHALL render those elements like GitHub, keep Markdown after a blank line inside an HTML block rendered, and, in edit mode, show each HTML block as an admonition-like block titled with its literal opening tag, without any script, event handler or style the sanitizer does not already keep. The preview SHALL render a raw details element with an optional open attribute and a plain summary element as a collapsible section, and a kbd element without attributes as a key cap, and SHALL omit raw HTML outside the allow-list of tags and attributes.

### Scenario (nominal): README header

- GIVEN a document whose first block is &lt;div align="center"&gt;, then after a blank line an &lt;img src width height alt&gt;, a Markdown heading and a Markdown badge row, then &lt;/div&gt;
- WHEN the document is rendered
- THEN the preview holds one `div` with `align="center"` whose content is the image at its width and height, the heading and the badge row, each Markdown block rendered as Markdown

### Scenario (nominal): Elements kept

| Source | Rendered as |
| --- | --- |
| &lt;p align="center"&gt; | a `p` with `align` center (also left, right, justify) |
| `<br>`, `<sub>`, `<sup>`, `<kbd>` | the same element |
| &lt;a href&gt;&lt;img&gt;&lt;/a&gt; | a link around the image |
| &lt;picture&gt; with &lt;source media="(prefers-color-scheme: dark)" srcset&gt; and a fallback &lt;img&gt; | the dark image in a dark preview, the fallback image otherwise, following the preview theme and not the system |
| &lt;details&gt; (optionally `open`) with a plain &lt;summary&gt;, in one block or as a head block, the Markdown between and a closing &lt;/details&gt; block | a collapsible section, open when the attribute is set, with the summary as its title and the body rendered; an empty summary reads Details |
| a &lt;summary&gt; holding markup | not recognised |

### Scenario (nominal): The allow-list of tags

| Kind | Tags kept (attributes are kept per tag from a fixed list) |
| --- | --- |
| block | div, p, center, blockquote, ul, ol, li, dl, dt, dd, details, summary, figure, figcaption, hr, h1 to h6 |
| inline | span, br, img, a, picture, source, sub, sup, b, i, em, strong, u, s, del, ins, small, kbd, code, mark |
| dropped with their content | script, style, iframe, object, embed, textarea, noscript, template, svg, math, title, xmp, frameset, applet |

### Scenario (nominal): Edit mode

- GIVEN edit mode is on
- WHEN a `div`, `p` or `picture` block is rendered
- THEN it is shown as an admonition-like block titled with its literal opening tag in code font, for example &lt;div align="center"&gt; (shortened with an ellipsis when long), and a click on it edits the raw source lines of the block only; read mode shows no frame and no title

### Scenario (nominal): Kbd renders as a key cap

| Input | Outcome |
| --- | --- |
| the text 'Press' followed by a kbd element containing Ctrl | a kbd element with the key text is present |
| a kbd block holding Ctrl | a key element shows |
| a kbd element beside an unsupported tag | kbd is kept and the unsupported tag is absent |

### Scenario (refusal): Kbd with attributes

- GIVEN a kbd element with an onclick attribute
- WHEN the preview is rendered
- THEN no attributed kbd element is rendered

### Scenario (refusal): Nothing active survives

- GIVEN raw HTML with &lt;script&gt;, &lt;iframe&gt;, an `onclick` or `onerror` attribute, a `style` or `class` attribute, a `javascript:` link or an unknown element
- WHEN the document is rendered
- THEN the script, iframe and unknown elements are dropped (with their content for script, style and iframe) and no event handler, style, class or script URL reaches the page; the sanitizer allows no attribute it did not already allow

| Input | Outcome |
| --- | --- |
| a div block with text and an inline marquee element | the elements are absent from the HTML |
| a raw iframe block | nothing of it appears |

### Related requirements

- SwRS-MDOKFSTUDIO-CORE-003: the source lines of a block, which the HTML block shares.
- SwRS-MDOKFSTUDIO-GFM-031: raw HTML tables, which keep their own path.
- SwRS-MDOKFSTUDIO-GFM-034: colour spans, which keep their own path.
- SwRS-MDOKFSTUDIO-REVIEW-003: the literal-tag title of a comment block in edit mode.

### Verification notes

- Method: test/core/render/mystRawHtml.test.ts (structure, Markdown inside an HTML block, source lines, picture themes, refusals), test/core/preview/previewStyles.test.ts (align, theme and edit-mode frame rules).
- Method: test/core/render/mystPaletteRendering.test.ts (details with summary, empty summary, kbd; the unit test "a collapsible section inserted by the edition palette renders as details with a summary"), test/core/render/renderReq.gfm.requirements.test.ts (a div block and an inline marquee element are absent while kbd stays), test/core/render/renderReq.renderingCore.requirements.test.ts (a raw iframe block is dropped and a raw kbd kept). Untested: a kbd with attributes, a lone img and context tags.
- Method: real-window scenario test/integration/readmeHtmlWindow.ts (the painted layout in read mode, the titles in edit mode, a click that edits the block source).
- Criteria: the rendered tree and CSS match the table above, no unsafe attribute or element survives, and the painted page shows a centred image and heading.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-001](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-001.md): A reader reads a faithful rendering of any document
  - [StRS-MDOKFSTUDIO-GFM-002](../../strs/gfm/StRS-MDOKFSTUDIO-GFM-002.md): GitHub Flavored Markdown renders as on GitHub, safely
- Supersedes:
  - [SwRS-MDOKFSTUDIO-CORE-044](SwRS-MDOKFSTUDIO-CORE-044.md): Drop unsupported raw HTML
  - [SwRS-MDOKFSTUDIO-CORE-062](SwRS-MDOKFSTUDIO-CORE-062.md): Render details and kbd blocks
  - [SwRS-MDOKFSTUDIO-GFM-029](../gfm/SwRS-MDOKFSTUDIO-GFM-029.md): A small raw HTML subset renders and the rest is dropped
  - [SwRS-MDOKFSTUDIO-GFM-030](../gfm/SwRS-MDOKFSTUDIO-GFM-030.md): Raw kbd renders as a key cap
  - [SwRS-MDOKFSTUDIO-GFM-033](../gfm/SwRS-MDOKFSTUDIO-GFM-033.md): Unsupported raw HTML is dropped
<!-- okf:links:end -->
