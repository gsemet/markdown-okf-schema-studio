---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-086
uuid: a98b68ba-9911-4c07-b2c2-9208f62df365
title: In Restricted Mode the banner lists warnings in its tooltip
description: When the workspace is untrusted, the extension SHALL not publish
  warnings to the Problems view and show the banner without Open Problems,
  listing the warnings in its tooltip, with the close button kept.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-014
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## In Restricted Mode the banner lists warnings in its tooltip

### Normative behavior

When the workspace is untrusted, the extension SHALL not publish warnings to the Problems view and show the banner without Open Problems, listing the warnings in its tooltip, with the close button kept.

### Scenario: Nominal

- GIVEN an untrusted workspace
- WHEN the preview renders
- THEN no Open Problems button and the tooltip lists the lines

### Scenario: Boundary or refusal

- GIVEN the close button
- WHEN it is activated
- THEN the banner closes

### Verification notes

- Method: test
- Criteria: Standalone variant is untested.
