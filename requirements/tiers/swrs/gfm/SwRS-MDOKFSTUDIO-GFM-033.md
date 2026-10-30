---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-033
uuid: 0e79ac91-5723-4411-b0b7-215e356f2dee
title: Unsupported raw HTML is dropped
description: When a document contains raw HTML outside the supported subset, the
  extension SHALL omit it from the rendering.
project: markdown-okf-schema-studio
scope: gfm
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-002
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-GFM-029; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-GFM-029
default_owner_email: gaetan@xeberon.net
---

## Unsupported raw HTML is dropped

### Normative behavior

When a document contains raw HTML outside the supported subset, the extension SHALL omit it from the rendering.

### Scenario: Unsupported tag dropped

- GIVEN a div block with text and an inline marquee element
- WHEN the preview is rendered
- THEN the elements are absent from the HTML

### Scenario: Supported subset kept

- GIVEN a kbd element beside an unsupported tag
- WHEN the preview is rendered
- THEN kbd is kept and the unsupported tag is absent

### Verification notes

- Method: Unit test "a div block and an inline marquee element are absent from the HTML, while kbd stays" in test/core/render/renderReq.gfm.requirements.test.ts.
- Criteria: Unsupported tags are absent.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-GFM-002](../../strs/gfm/StRS-MDOKFSTUDIO-GFM-002.md): GitHub Flavored Markdown renders as on GitHub, safely
- Superseded by:
  - [SwRS-MDOKFSTUDIO-GFM-029](SwRS-MDOKFSTUDIO-GFM-029.md): A small raw HTML subset renders and the rest is dropped
<!-- okf:links:end -->
