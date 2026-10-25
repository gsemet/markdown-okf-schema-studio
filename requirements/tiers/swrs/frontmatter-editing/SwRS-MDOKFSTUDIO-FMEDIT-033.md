---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-033
uuid: bd442c95-fc03-4540-9347-e5268b402d99
title: The Add field picker lists the schema fields still missing
description: When a writer chooses Add field and the schema has fields not in
  the document, the extension SHALL show a select of those fields and add the
  chosen one at once with its default value.
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
---

## The Add field picker lists the schema fields still missing

### Normative behavior

When a writer chooses Add field and the schema has fields not in the document, the extension SHALL show a select of those fields and add the chosen one at once with its default value.

### Scenario: Nominal

- GIVEN a schema with the missing field owner
- WHEN the writer opens Add field and chooses owner in the select "Frontmatter field to add" (placeholder "Choose a field...")
- THEN an add save for owner is posted at once, with the first value found among the schema default, then the empty string

### Scenario: Boundary or refusal

- GIVEN missing fields of type boolean, number, list and enum
- WHEN each is chosen
- THEN the values posted are false, 0, an empty list and the first enum value

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterFields.test.ts).
- Criteria: Tests T24 choosing a field in the picker adds it right after the open row.
