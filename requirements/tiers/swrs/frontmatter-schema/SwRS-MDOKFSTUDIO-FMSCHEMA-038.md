---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-038
uuid: 1cd269f1-a03f-4dc6-8d5b-674fc7bc4058
title: Missing required fields are summarised under the table
description: 'When required fields are missing, the extension SHALL show a red line
  under the table that reads "Missing required fields: {names}" in schema order, announced
  to screen readers.'
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-010
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-039; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMSCHEMA-039
default_owner_email: gaetan@xeberon.net
---

## Missing required fields are summarised under the table

### Normative behavior

When required fields are missing, the extension SHALL show a red line under the table that reads "Missing required fields: {names}" in schema order, announced to screen readers.

### Scenario: Two missing fields

- GIVEN a schema requiring title and owner and a document with neither
- WHEN the preview is rendered
- THEN a line under the table reads Missing required fields: title, owner and has role alert

### Scenario: None missing

- GIVEN a document with both fields
- WHEN the preview is rendered
- THEN no such line is shown

### Verification notes

- Method: Unit test of the analysis and of the table renderer; visual scenario.
- Criteria: Names follow the order in which the effective schema collected its required lists.
