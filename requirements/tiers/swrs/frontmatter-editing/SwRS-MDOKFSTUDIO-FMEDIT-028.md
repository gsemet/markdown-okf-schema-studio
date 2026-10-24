---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-028
uuid: 54eced91-2e1a-46d6-8409-7e4907f04bcc
title: "Every field editor has an Add field button in a field action menu"
description: "When a field editor is open, the extension SHALL show inside the edited
  row, after the control, a field action menu labelled \"Frontmatter field actions\"\
  \ with an \"Add field\" button."
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-006
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Every field editor has an Add field button in a field action menu

### Normative behavior

When a field editor is open, the extension SHALL show inside the edited row, after the control, a field action menu labelled "Frontmatter field actions" with an "Add field" button.

### Scenario: Nominal

- GIVEN a value editor open on a row
- WHEN the editor renders
- THEN a toolbar "Frontmatter field actions" sits in the edited row after the control with a button "Add frontmatter field" labelled Add field

### Scenario: Boundary or refusal

- GIVEN a key editor open on a row
- WHEN the editor renders
- THEN the same menu with the Add field button appears

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterEditor.test.ts).
- Criteria: Tests frontmatter field actions render inside the edited row.
