---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-010
uuid: 2ec5f533-e4bb-42c2-8a1c-bdc26081a8fb
title: List fields edit as one input per item
description: When a writer opens the editor of a list field, the extension SHALL
  show one text input per item, each with a drag handle and a remove button, an
  Add item button and no Save or Cancel button.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## List fields edit as one input per item

### Normative behavior

When a writer opens the editor of a list field, the extension SHALL show one text input per item, each with a drag handle and a remove button, an Add item button and no Save or Cancel button.

Known issue: list items are edited as strings: a number in a list is saved as text.

### Scenario: Nominal

- GIVEN a list field with items a and b
- WHEN the writer opens its editor
- THEN two inputs labelled List item 1 and List item 2 appear with a handle and a remove button each, plus "+ Add item" and no Save or Cancel button

### Scenario: Boundary or refusal

- GIVEN the same editor
- WHEN the writer leaves the editor by moving focus out of it
- THEN the list is saved as an array of strings; focus moving to the field menu or a drag in progress does not save

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterEditor.test.ts).
- Criteria: Items are shown and saved as strings.
