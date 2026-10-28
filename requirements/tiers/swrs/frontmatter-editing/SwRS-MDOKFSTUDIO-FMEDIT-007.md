---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-007
uuid: 60795bb6-e325-42a1-9e27-4912b3e78cdd
title: Number, date and time fields use native inputs
description: "When a writer opens the editor of a number, date or time field, the
  extension SHALL show a native number input with any step, a date input or a time
  input."
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-003; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMEDIT-003
default_owner_email: gaetan@xeberon.net
---

## Number, date and time fields use native inputs

### Normative behavior

When a writer opens the editor of a number, date or time field, the extension SHALL show a native number input with any step, a date input or a time input.

### Scenario: Nominal

- GIVEN a schema number field and a schema date field
- WHEN the writer opens their editors
- THEN the number editor is an input of type number with step any and the date editor an input of type date; a time field gets type time

### Scenario: Boundary or refusal

- GIVEN a schema date-time field
- WHEN the writer opens its editor
- THEN it is a plain text input, not a date-time picker

### Known issues

- Known issue: date-time fields are edited as plain text.

### Verification notes

- Method: Unit test number, date and time fields get native inputs; a date-time field stays a text input in test/page/fmtableReqFrontmatter.requirements.test.ts.
- Criteria: Input type per field type: number, date, time, otherwise text.
