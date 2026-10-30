---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-062
uuid: 73dc26ed-f85c-4c71-bdf4-8eef1506f261
title: Render details and kbd blocks
description: When a document holds a raw details block (with an optional open
  state and a summary) or kbd block, the extension SHALL render a dropdown or
  key element with its content parsed as Markdown.
project: markdown-okf-schema-studio
scope: rendering-core
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

## Render details and kbd blocks

### Normative behavior

When a document holds a raw details block (with an optional open state and a summary) or kbd block, the extension SHALL render a dropdown or key element with its content parsed as Markdown.

### Scenario: Nominal render details and kbd blocks

- GIVEN an open details element with a summary
- WHEN it is rendered
- THEN an open dropdown with the summary shows

### Scenario: Boundary or refusal of render details and kbd blocks

- GIVEN a kbd block holding Ctrl
- WHEN it is rendered
- THEN a key element shows

### Verification notes

- Method: Unit test "a collapsible section inserted by the edition palette renders as details with a summary" in test/core/render/mystPaletteRendering.test.ts
- Criteria: Both blocks are converted and their content parsed.
- Evidence: the details form is covered through the gfm and myst tests under `test/core/render/`; the kbd form has its own unit test.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-GFM-002](../../strs/gfm/StRS-MDOKFSTUDIO-GFM-002.md): GitHub Flavored Markdown renders as on GitHub, safely
- Superseded by:
  - [SwRS-MDOKFSTUDIO-GFM-029](../gfm/SwRS-MDOKFSTUDIO-GFM-029.md): A small raw HTML subset renders and the rest is dropped
<!-- okf:links:end -->
