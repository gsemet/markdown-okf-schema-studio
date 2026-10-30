---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-046
uuid: 1d664170-357e-4be4-afda-43528755ed66
title: Render identically in every palette mode
description: When the palette mode is Strict, GFM or MyST, the extension SHALL
  render the same HTML for the same Markdown, as the mode changes buttons only.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CORE-001; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-CORE-001
default_owner_email: gaetan@xeberon.net
---

## Render identically in every palette mode

### Normative behavior

When the palette mode is Strict, GFM or MyST, the extension SHALL render the same HTML for the same Markdown, as the mode changes buttons only.

### Scenario: Nominal

- GIVEN one document
- WHEN it is rendered once per palette mode (Strict, GFM, MyST)
- THEN the three HTML outputs are byte-identical

### Scenario: Boundary or refusal

- GIVEN a mode with a different set of palette buttons
- WHEN the document is rendered
- THEN the content HTML is unchanged

### Verification notes

- Method: Unit test "the rendered HTML is the same whatever the palette mode: the render takes no mode" in test/core/render/renderReq.renderingCore.requirements.test.ts
- Criteria: Rendered HTML is the same in all three modes.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-001](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-001.md): A reader reads a faithful rendering of any document
- Superseded by:
  - [SwRS-MDOKFSTUDIO-CORE-001](SwRS-MDOKFSTUDIO-CORE-001.md): The preview renders the unsaved buffer completely, in process
<!-- okf:links:end -->
