---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-035
uuid: 8f813918-0090-4904-9f44-62eb4c4ba30d
title: "The picker offers a Custom key when extra properties are allowed"
description: "When the Add field picker lists schema fields and the schema allows
  additional properties, the extension SHALL add \"Custom key…\" to the select and
  show a \"New field name\" input that adds the typed key with an empty value on Enter."
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-005
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-028; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMEDIT-028
default_owner_email: gaetan@xeberon.net
---

## The picker offers a Custom key when extra properties are allowed

### Normative behavior

When the Add field picker lists schema fields and the schema allows additional properties, the extension SHALL add "Custom key…" to the select and show a "New field name" input that adds the typed key with an empty value on Enter.

### Scenario: Nominal

- GIVEN a picker listing schema fields and a schema that allows additional properties
- WHEN the writer chooses "Custom key…"
- THEN a "New field name" input appears, nothing is posted, and Enter in it with the name notes posts an add of notes with an empty value

### Scenario: Boundary or refusal

- GIVEN a schema root with additionalProperties false and schema fields left to add
- WHEN the picker renders
- THEN it lists the fields and has no "Custom key…" entry (the properties section carries the flag of SwRS-MDOKFSTUDIO-FMEDIT-086)

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterFields.test.ts).
- Criteria: Tests T25 the picker offers Custom key only when additional properties are allowed; choosing Custom key shows the name input; Enter adds the field.
