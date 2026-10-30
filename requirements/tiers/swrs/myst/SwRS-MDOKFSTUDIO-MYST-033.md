---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-033
uuid: 54730c6d-2f8e-446f-960a-dc5467a4800e
title: Figure width values are validated
description: When a `{figure}` or `{image}` has `:width:`, the extension SHALL
  keep a number or a number with px, %, em or rem as data-okf-width and drop any
  other value.
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

## Figure width values are validated

### Normative behavior

When a `{figure}` or `{image}` has `:width:`, the extension SHALL keep a number or a number with px, %, em or rem as data-okf-width and drop any other value.

### Scenario: Nominal

- GIVEN `:width: 60%`
- WHEN the preview renders
- THEN data-okf-width is 60% and the width attribute is removed

### Scenario: Boundary or refusal

- GIVEN `:width: 60%;position:fixed` or `auto`, or a hand-edited bad value
- WHEN the preview renders
- THEN the value is dropped and the sanitizer reports Removed an unsupported figure width

### Verification notes

- Method: Unit test "a figure keeps its width and alignment as data attributes and classes" in test/core/render/mystPaletteRendering.test.ts; Unit test "data-okf-width keeps a plain length and nothing else" in test/security/html-policy.test.ts
- Criteria: A plain number means pixels.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-001](../../strs/myst/StRS-MDOKFSTUDIO-MYST-001.md): MyST directives and roles render as readable blocks
- Superseded by:
  - [SwRS-MDOKFSTUDIO-MYST-031](SwRS-MDOKFSTUDIO-MYST-031.md): Figures render with image, caption, label, width and alignment
<!-- okf:links:end -->
