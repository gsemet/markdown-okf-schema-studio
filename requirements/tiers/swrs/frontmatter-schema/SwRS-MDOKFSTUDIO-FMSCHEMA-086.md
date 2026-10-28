---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-086
uuid: 5fdad281-549c-451d-bce7-6116600cdcdd
title: A link problem is keyboard-focusable and explained in its tooltip
description: When a frontmatter link does not resolve, the extension SHALL make
  its text keyboard-focusable and carry the full "[E10]" or "[W15]" message in
  its tooltip.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-014
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-063; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-063
default_owner_email: gaetan@xeberon.net
---

## A link problem is keyboard-focusable and explained in its tooltip

### Normative behavior

When a frontmatter link does not resolve, the extension SHALL make its text keyboard-focusable and carry the full "[E10]" or "[W15]" message in its tooltip.

### Scenario: Not found

- GIVEN a link value nope.md
- WHEN the table is rendered
- THEN the text can be focused with the keyboard and its tooltip holds the full [E10] message

### Scenario: Root unavailable

- GIVEN a bundle-relative link without a bundle root
- WHEN the table is rendered
- THEN the tooltip holds the full [W15] message

### Verification notes

- Method: Unit test of the table renderer; integration test.
- Criteria: The tooltip is shown by the Studio link tooltip on hover and focus.
