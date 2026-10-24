---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-003
uuid: 3ec737ad-d517-4d3f-8399-267c1c65f9fa
title: "Enum fields show a select of the schema values"
description: "When a writer opens the editor of a schema enum field, the extension
  SHALL show a select offering the schema values."
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-002
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Enum fields show a select of the schema values

### Normative behavior

When a writer opens the editor of a schema enum field, the extension SHALL show a select offering the schema values.

### Scenario: Nominal

- GIVEN a schema enum field lifecycle with the values draft and active, currently draft
- WHEN the writer opens its editor
- THEN the select holds the empty "Choose a value..." entry, draft and active, with draft selected

### Scenario: Boundary or refusal

- GIVEN an enum field whose current value is not one of the schema values
- WHEN the writer opens its editor
- THEN the disabled entry "Choose a value..." is selected and the select carries data-okf-empty-select true

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterEditor.test.ts) and visual scenario frontmatter-editing/v02-edit-enum-value-dark-900.
- Criteria: The entry "Choose a value..." is always the first option; Escape cancels.
