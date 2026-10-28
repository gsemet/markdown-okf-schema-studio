---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-086
uuid: 2a6c66e6-591d-486a-9696-3dd8cec553cc
title: A closed schema flags the properties section
description: When the schema root forbids additional properties, the extension
  SHALL flag the properties section with data-okf-additional-properties="false".
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-005
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-084; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMSCHEMA-084
default_owner_email: gaetan@xeberon.net
---

## A closed schema flags the properties section

### Normative behavior

When the schema root forbids additional properties, the extension SHALL flag the properties section with data-okf-additional-properties="false".

### Scenario: Nominal

- GIVEN a schema root with additionalProperties false and a document with the scope field
- WHEN the properties table renders
- THEN the properties section carries data-okf-additional-properties="false"

### Scenario: Boundary or refusal

- GIVEN a schema root that allows additional properties, or one that does not state it
- WHEN the properties table renders
- THEN the properties section has no data-okf-additional-properties attribute

### Verification notes

- Method: Unit test on the renderer (test/core/frontmatter/propertiesTable.test.ts).
- Criteria: Test T25 the section flags a schema that forbids additional properties; the Add field picker reads this flag and then lists no "Custom key..." entry (SwRS-MDOKFSTUDIO-FMEDIT-035).
