---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-007
uuid: 60795bb6-e325-42a1-9e27-4912b3e78cdd
title: Number, date and time fields use native inputs
description: When a writer opens the editor of a number, date or time field, the
  extension SHALL show a native number input with any step, a date input or a
  time input.
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

## Number, date and time fields use native inputs

### Normative behavior

When a writer opens the editor of a number, date or time field, the extension SHALL show a native number input with any step, a date input or a time input.

Known issue: date-time fields are edited as plain text.

### Scenario: Nominal

- GIVEN a schema number field and a schema date field
- WHEN the writer opens their editors
- THEN the number editor is an input of type number with step any and the date editor an input of type date; a time field gets type time

### Scenario: Boundary or refusal

- GIVEN a schema date-time field
- WHEN the writer opens its editor
- THEN it is a plain text input, not a date-time picker

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterEditor.test.ts) and inspection of openFrontmatterValueEditor.
- Criteria: Input type per field type: number, date, time, otherwise text.
