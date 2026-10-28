---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-030
uuid: 2f9b8aeb-70f3-41b9-aa19-5eb2afe9876b
title: Field names show a type icon and a type label
description: When a schema table is displayed, the extension SHALL show before
  each field name a type icon of at most 1.5 em with the type name as tooltip,
  and after the name the label "({type})".
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-010
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-029; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMSCHEMA-029
default_owner_email: gaetan@xeberon.net
---

## Field names show a type icon and a type label

### Normative behavior

When a schema table is displayed, the extension SHALL show before each field name a type icon of at most 1.5 em with the type name as tooltip, and after the name the label "({type})".

### Scenario: Icon and label

- GIVEN a schema table with a boolean field
- WHEN the preview is rendered
- THEN the name cell holds the checkbox icon titled Checkbox and the label (boolean)

### Scenario: Unknown type

- GIVEN a field with no usable type declaration
- WHEN the preview is rendered
- THEN the icon is titled Unknown type and the label reads (unknown)

### Verification notes

- Method: Unit test of the table renderer; visual scenario (icon size check).
- Criteria: Icon titles: Text, Number, List, Checkbox, Options (enum), Date, Time, Date and time, Unknown type.
