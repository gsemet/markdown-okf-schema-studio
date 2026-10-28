---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-050
uuid: 1272207c-cfc3-4b55-83f8-6ea217a8c4fb
title: Editor controls do not apply the schema hints
description: "When a writer edits a number or text field, the extension SHALL show
  the control without the schema minimum, maximum, length or pattern limits and leave
  out-of-range values to the check at save time."
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
superseded_by:
- SwRS-MDOKFSTUDIO-FMEDIT-003
default_owner_email: gaetan@xeberon.net
---

## Editor controls do not apply the schema hints

### Normative behavior

When a writer edits a number or text field, the extension SHALL show the control without the schema minimum, maximum, length or pattern limits and leave out-of-range values to the check at save time.

### Scenario: Nominal

- GIVEN a schema number field with minimum 0 and maximum 10
- WHEN its editor opens
- THEN the input has no min or max attribute and accepts 11

### Scenario: Boundary or refusal

- GIVEN the value 11 is saved
- WHEN the host checks the edited document
- THEN the save is refused with a message starting "Schema validation failed: "

### Known issues

- Known issue: the schema minimum, maximum and pattern are not applied to the inputs and a required enum still shows the empty placeholder.

### Verification notes

- Method: Unit test the number input carries no schema limits and a value out of range is refused at save time in test/page/fmtableReqFrontmatter.requirements.test.ts.
- Criteria: Only step any is set on number inputs.
