---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-048
uuid: e92aadc4-2852-4118-86c3-4619eb13c135
title: A schema error on the edited field refuses the save
description: 'When the edited document has a schema error on the edited field, the
  extension SHALL refuse the save with "Schema validation failed: {message}".'
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-008
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-016; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMEDIT-016
---

## A schema error on the edited field refuses the save

### Normative behavior

When the edited document has a schema error on the edited field, the extension SHALL refuse the save with "Schema validation failed: {message}".

### Scenario: Nominal

- GIVEN a schema field with a constraint the new value violates
- WHEN the save arrives
- THEN the answer is "Schema validation failed: " followed by the schema message and the document is unchanged

### Scenario: Boundary or refusal

- GIVEN a rename after which the field cannot be found in the re-analysis
- WHEN the save arrives
- THEN the answer is "The renamed frontmatter field could not be validated."

### Verification notes

- Method: Unit test on the candidate check (test/core/edits/frontmatterEdit.test.ts).
- Criteria: Conditional (if/then) rules apply through the analysis of the candidate text.
