---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-059
uuid: c89fa8a0-c87b-4413-b47d-3dcb34671007
title: Use a figure body as its caption
description: When a figure's body supplies the text, the extension SHALL show it
  as the caption.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-031; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-MYST-031
default_owner_email: gaetan@xeberon.net
---

## Use a figure body as its caption

### Normative behavior

When a figure's body supplies the text, the extension SHALL show it as the caption.

### Scenario: Nominal use a figure body as its caption

- GIVEN a figure with body text
- WHEN it is rendered
- THEN the text appears as caption

### Scenario: Boundary or refusal of use a figure body as its caption

- GIVEN a figure without body
- WHEN it is rendered
- THEN no caption is added

### Verification notes

- Method: Unit test "figure references render figures whose body supplies the caption" in test/core/render/mystFeatures.test.ts
- Criteria: The caption equals the body.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-001](../../strs/myst/StRS-MDOKFSTUDIO-MYST-001.md): MyST directives and roles render as readable blocks
- Superseded by:
  - [SwRS-MDOKFSTUDIO-MYST-031](../myst/SwRS-MDOKFSTUDIO-MYST-031.md): Figures render with image, caption, label, width and alignment
<!-- okf:links:end -->
