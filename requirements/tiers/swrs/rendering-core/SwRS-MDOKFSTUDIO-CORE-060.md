---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-060
uuid: 123fdef9-c363-4cb4-8849-3b386ced69fb
title: Keep references to captionless targets readable
description: When a `{numref}` or `{ref}` points to a figure or table without a
  caption, the extension SHALL render a readable link, not an empty one.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-005
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
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

- Method: test
- Criteria: No reference link is empty.
