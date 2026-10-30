---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-003
uuid: 78e1db8b-0cc1-4d17-974d-8aecc05227fc
title: Admonition galleries keep one title line per panel without sideways
  scroll
description: When the preview renders an admonition gallery at any theme and
  pane width, the extension SHALL give each admonition exactly one title line, a
  source line and a panel colour distinct from the page, with no horizontal
  overflow.
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

## Admonition galleries keep one title line per panel without sideways scroll

### Normative behavior

When the preview renders an admonition gallery at any theme and pane width, the extension SHALL give each admonition exactly one title line, a source line and a panel colour distinct from the page, with no horizontal overflow.

### Scenario: Nominal

- GIVEN the admonition gallery document in dark and light themes at 900 px
- WHEN the preview renders
- THEN each admonition has one title line, a source line and a distinct panel colour, the paragraph after it keeps the body text colour and the page does not scroll sideways

### Scenario: Boundary or refusal

- GIVEN the same gallery at 460 px, scrolled to a titled block or to the end
- WHEN the preview renders
- THEN the same assertions hold and the scrolled-to block stays inside the frame

### Verification notes

- Method: Visual scenario admonitions-dark-titled in test/visual/scenarioDefinitions1.ts
- Criteria: The visual gallery scenarios (one family) pass the shared admonition checks.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-001](../../strs/myst/StRS-MDOKFSTUDIO-MYST-001.md): MyST directives and roles render as readable blocks
- Superseded by:
  - [SwRS-MDOKFSTUDIO-MYST-006](SwRS-MDOKFSTUDIO-MYST-006.md): Admonitions nest, collapse and map as one block
<!-- okf:links:end -->
