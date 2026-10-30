---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-060
uuid: 123fdef9-c363-4cb4-8849-3b386ced69fb
title: Keep references to captionless targets readable
description: When a `{numref}` or `{ref}` points to a figure or table without a
  caption, the extension SHALL render a readable link, not an empty one.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-005
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-019; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-MYST-019
default_owner_email: gaetan@xeberon.net
---

## Keep references to captionless targets readable

### Normative behavior

When a `{numref}` or `{ref}` points to a figure or table without a caption, the extension SHALL render a readable link, not an empty one.

### Scenario: Nominal keep references to captionless targets readable

- GIVEN a numref to a captionless figure
- WHEN it is rendered
- THEN the link has text

### Scenario: Boundary or refusal of keep references to captionless targets readable

- GIVEN a ref to a captioned table
- WHEN it is rendered
- THEN the caption is the text

### Verification notes

- Method: Unit test "references to captionless figures and tables stay readable" in test/core/render/mystFeatures.test.ts
- Criteria: No reference link is empty.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-005](../../strs/myst/StRS-MDOKFSTUDIO-MYST-005.md): Build-dependent constructs appear as labelled placeholders
- Superseded by:
  - [SwRS-MDOKFSTUDIO-MYST-019](../myst/SwRS-MDOKFSTUDIO-MYST-019.md): Reference roles link to in-page targets
<!-- okf:links:end -->
