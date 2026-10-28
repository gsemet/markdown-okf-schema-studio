---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-034
uuid: 3a54055f-9226-420b-929e-702e13c11828
title: Field names equal to object members are not treated as present
description: When a document or a schema uses a field name such as `constructor`
  or `toString`, the extension SHALL treat the name as present or declared only
  if it really is.
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
superseded_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-029
default_owner_email: gaetan@xeberon.net
---

## Field names equal to object members are not treated as present

### Normative behavior

When a document or a schema uses a field name such as `constructor` or `toString`, the extension SHALL treat the name as present or declared only if it really is.

### Scenario: Inherited name

- GIVEN a schema declaring and requiring toString and a document with a key constructor
- WHEN the document is analysed
- THEN constructor is an undeclared key and toString is reported as a missing required field

### Scenario: Declared name

- GIVEN a schema that really declares constructor and a document that sets it
- WHEN the document is analysed
- THEN constructor is a declared present field

### Verification notes

- Method: Unit test of the effective properties.
- Criteria: Properties live in a null-prototype map and are tested with Object.hasOwn.
