---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-008
uuid: c52bc503-ab2f-4ea9-ac6a-7bfc2af33674
title: An admonition is one mapped block over its whole directive
description: When an admonition renders, the extension SHALL map it as one block
  from its opening line to its closing fence.
project: markdown-okf-schema-studio
scope: myst
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-006; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-MYST-006
default_owner_email: gaetan@xeberon.net
---

## An admonition is one mapped block over its whole directive

### Normative behavior

When an admonition renders, the extension SHALL map it as one block from its opening line to its closing fence.

### Scenario: Nominal

- GIVEN a three-line admonition at lines 5 to 7
- WHEN the preview renders
- THEN the panel carries data-line 5 and data-end-line 7

### Scenario: Boundary or refusal

- GIVEN an admonition nested in another
- WHEN the preview renders
- THEN the outer panel spans the whole outer directive

### Verification notes

- Method: Unit test "MyST admonitions retain the directive range through the closing fence" in test/core/render/mystFeatures.test.ts
- Criteria: data-line and data-end-line match the directive's source lines.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-001](../../strs/myst/StRS-MDOKFSTUDIO-MYST-001.md): MyST directives and roles render as readable blocks
- Superseded by:
  - [SwRS-MDOKFSTUDIO-MYST-006](SwRS-MDOKFSTUDIO-MYST-006.md): Admonitions nest, collapse and map as one block
<!-- okf:links:end -->
