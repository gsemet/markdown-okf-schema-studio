---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-029
uuid: 1ac5f94d-2922-40bc-a8d8-b6621b8b8970
title: A small raw HTML subset renders and the rest is dropped
description: When a document contains raw HTML, the extension SHALL render a raw
  details element with optional open and a plain summary element, in one block
  or as head, body and closing blocks, as a collapsible section (with the
  summary Details when empty), and a kbd element without attributes as a key
  cap, and omit raw HTML outside the supported subset from the rendering.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-002
- StRS-MDOKFSTUDIO-CORE-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/mystBlockTransforms.ts
- src/core/render/mystRenderer.ts
tested_in_files:
- test/core/render/mystPaletteRendering.test.ts
- test/core/render/renderReq.gfm.requirements.test.ts
- test/core/render/renderReq.renderingCore.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## A small raw HTML subset renders and the rest is dropped

### Normative behavior

When a document contains raw HTML, the extension SHALL render a raw details element with optional open and a plain summary element, in one block or as head, body and closing blocks, as a collapsible section (with the summary Details when empty), and a kbd element without attributes as a key cap, and omit raw HTML outside the supported subset from the rendering.

### Scenario (nominal): Details with summary

- GIVEN a details element with the open attribute and a summary reading More, and a Markdown body
- WHEN the preview is rendered
- THEN a collapsible section is open with title More and the body rendered

### Scenario (boundary): Empty summary and unsupported markup

- GIVEN an empty summary element and a summary with markup
- WHEN the preview is rendered
- THEN the empty one reads Details and the marked-up one is not recognised

### Scenario (nominal): Kbd renders as a key cap

| Input | Outcome |
| --- | --- |
| the text 'Press' followed by a kbd element containing Ctrl | a kbd element with the key text is present |
| a kbd block holding Ctrl | a key element shows |

### Scenario (refusal): Kbd with attributes

- GIVEN a kbd element with an onclick attribute
- WHEN the preview is rendered
- THEN no attributed kbd element is rendered

### Scenario (refusal): Unsupported raw HTML is dropped

| Input | Outcome |
| --- | --- |
| a div block with text and an inline marquee element | the elements are absent from the HTML |
| a raw iframe block | nothing of it appears |
| a kbd element beside an unsupported tag | kbd is kept and the unsupported tag is absent |

The supported subset also holds raw HTML tables (see SwRS-MDOKFSTUDIO-GFM-031), colour spans (see SwRS-MDOKFSTUDIO-GFM-034), a lone img and context tags.

### Related requirements

- SwRS-MDOKFSTUDIO-GFM-031: raw HTML tables are part of the supported subset
- SwRS-MDOKFSTUDIO-GFM-034: colour spans are part of the supported subset

### Verification notes

- Method: test/core/render/mystPaletteRendering.test.ts (details with summary, empty summary, kbd: unit tests on the render pipeline output, including the unit test "a collapsible section inserted by the edition palette renders as details with a summary").
- Method: test/core/render/renderReq.gfm.requirements.test.ts (unsupported raw HTML is dropped: unit test "a div block and an inline marquee element are absent from the HTML, while kbd stays").
- Method: test/core/render/renderReq.renderingCore.requirements.test.ts (raw iframe block dropped and raw kbd kept: unit test "raw HTML outside the supported subset is dropped and a kbd element is kept"). Untested: kbd with attributes (the onclick case has no test named in the old notes), a lone img and context tags.
- Criteria: Details structure matches the source; only plain kbd elements are kept; only the supported subset survives rendering.
