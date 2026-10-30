---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-035
uuid: 16dfa995-5bb8-47aa-9027-a5a0c892a951
title: Figure alignment sets align classes and float
description: When a `{figure}` or `{image}` has `:align:` left, center or right,
  the extension SHALL give the figure and image an align class, floating left
  and right beside the text.
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

## Figure alignment sets align classes and float

### Normative behavior

When a `{figure}` or `{image}` has `:align:` left, center or right, the extension SHALL give the figure and image an align class, floating left and right beside the text.

### Scenario: Nominal

- GIVEN `:align: right`
- WHEN the preview renders
- THEN the figure floats right, the next paragraph wraps beside it and top-level headings clear the float

### Scenario: Boundary or refusal

- GIVEN an unknown alignment
- WHEN the preview renders
- THEN it is ignored

### Verification notes

- Method: Unit test "a figure keeps its width and alignment as data attributes and classes" in test/core/render/mystPaletteRendering.test.ts
- Criteria: Centre is centred; left and right float.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-001](../../strs/myst/StRS-MDOKFSTUDIO-MYST-001.md): MyST directives and roles render as readable blocks
- Superseded by:
  - [SwRS-MDOKFSTUDIO-MYST-031](SwRS-MDOKFSTUDIO-MYST-031.md): Figures render with image, caption, label, width and alignment
<!-- okf:links:end -->
