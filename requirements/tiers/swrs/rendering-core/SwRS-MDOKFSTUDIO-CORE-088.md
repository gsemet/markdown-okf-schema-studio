---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-088
uuid: 7466d4aa-2c36-4bf1-ac03-91d1a261ea8d
title: CommonMark constructs render the same in every palette mode and in a long
  document
description: When a document holds CommonMark constructs, the extension SHALL
  render each as its matching HTML element, identically in every palette mode,
  and render a document of about 6000 lines completely.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/mystEngine.ts
tested_in_files:
- test/core/render/mystFeatures.test.ts
- test/core/render/renderReq.renderingCore.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## CommonMark constructs render the same in every palette mode and in a long document

### Normative behavior

When a document holds CommonMark constructs, the extension SHALL render each as its matching HTML element, identically in every palette mode, and render a document of about 6000 lines completely.

### Scenario (nominal): Render the CommonMark constructs

- GIVEN a document with a heading of each level, a list, a quote, a thematic break, emphasis, a link, an image, inline code, strikethrough text and an h6 heading
- WHEN it is rendered
- THEN each construct appears as its matching HTML element, as the table shows

| Input | Outcome |
| --- | --- |
| headings h1 to h6 | matching heading element of each level; the h6 renders as a heading, not as a paragraph |
| paragraph | paragraph element |
| bullet list, numbered list | matching list element |
| block quote | block quote element |
| thematic break | thematic break element |
| emphasis, strong text | matching emphasis and strong elements |
| link, image | matching link and image elements |
| inline code | inline code element |
| strikethrough text | struck through |

### Scenario (nominal): Render identically in every palette mode

- GIVEN one document
- WHEN it is rendered once per palette mode (Strict, GFM, MyST), the mode changing buttons only
- THEN the three HTML outputs are byte-identical and the content HTML is unchanged

### Scenario (boundary): Render a very long document completely

- GIVEN a document of about 6000 lines, holding 335 sections and 336 headings
- WHEN it is rendered and the end of the page is scrolled to
- THEN all headings appear and the last paragraph is visible

### Verification notes

- Method: Unit test "the in-process renderer preserves the active-file MyST feature contract" in test/core/render/mystFeatures.test.ts (nominal CommonMark constructs)
- Method: Unit test "the rendered HTML is the same whatever the palette mode: the render takes no mode" in test/core/render/renderReq.renderingCore.requirements.test.ts (palette modes)
- Method: Visual scenario rendering-core/v20-huge-document-bottom-dark-900 in test/visual/scenarioDefinitions2.ts (very long document)
- Criteria: The rendered HTML holds one matching element per CommonMark construct, is the same in all three modes, and holds all headings and the last paragraph of the long document.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-001](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-001.md): A reader reads a faithful rendering of any document
<!-- okf:links:end -->
