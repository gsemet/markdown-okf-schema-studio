---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-032
uuid: 6839dbe5-27a2-4e91-a7bb-8688c205ce4a
title: Figure images outside the document folder load
description: When a figure image path points to a sibling folder such as
  `../external-img/depot-graph.svg`, the extension SHALL load it and keep its
  landmark in the frame.
project: markdown-okf-schema-studio
scope: myst
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

## Figure images outside the document folder load

### Normative behavior

When a figure image path points to a sibling folder such as `../external-img/depot-graph.svg`, the extension SHALL load it and keep its landmark in the frame.

### Scenario: Nominal

- GIVEN the long chapter with such a figure
- WHEN the preview renders
- THEN the image has a natural size above zero

### Scenario: Boundary or refusal

- GIVEN the chapter scrolled to the landmark
- WHEN the scroll lands
- THEN the landmark stays in the frame

### Verification notes

- Method: Unit test "resolves parent-relative figure images through the workspace root" in test/security/html-policy.test.ts; Visual scenario chapter-figure-dark in test/visual/scenarioDefinitions1.ts
- Criteria: Loading follows the resource policy.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-001](../../strs/myst/StRS-MDOKFSTUDIO-MYST-001.md): MyST directives and roles render as readable blocks
- Superseded by:
  - [SwRS-MDOKFSTUDIO-MYST-031](SwRS-MDOKFSTUDIO-MYST-031.md): Figures render with image, caption, label, width and alignment
<!-- okf:links:end -->
