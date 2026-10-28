---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-007
uuid: 9fca1bda-0f04-4e52-83ba-8e2265c9c3b9
title: Boolean values show as read-only checkboxes
description: When a frontmatter value is a boolean in read mode, the extension
  SHALL show a checkbox marked aria-disabled and removed from the Tab order,
  checked for true, followed by the word true or false.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-006; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMSCHEMA-006
default_owner_email: gaetan@xeberon.net
---

## Boolean values show as read-only checkboxes

### Normative behavior

When a frontmatter value is a boolean in read mode, the extension SHALL show a checkbox marked aria-disabled and removed from the Tab order, checked for true, followed by the word true or false.

### Scenario: True value

- GIVEN a field `flag: true`
- WHEN the properties table is rendered
- THEN the Value cell holds a checked checkbox with aria-disabled true and tabindex -1, and the word true

### Scenario: False value

- GIVEN a field `flag: false`
- WHEN the properties table is rendered
- THEN the Value cell holds an unchecked checkbox with aria-disabled true and the word false

### Verification notes

- Method: Unit test of the table renderer; visual scenarios v01 and v05.
- Criteria: The input has aria-disabled and tabindex -1 but not the HTML disabled attribute; clicking it in edit mode is a frontmatter-editing behaviour.
