---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-077
uuid: 7472b30b-adbb-4388-9cdd-1c1c21938085
title: Backspace in an empty list item removes it
description: When a writer presses Backspace in an empty list item input, the
  extension SHALL remove the item and focus the previous one.
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

## Backspace in an empty list item removes it

### Normative behavior

When a writer presses Backspace in an empty list item input, the extension SHALL remove the item and focus the previous one.

### Scenario: Nominal

- GIVEN a list editor with an empty middle item
- WHEN the writer presses Backspace in it
- THEN the item is removed and the previous input is focused

### Scenario: Boundary or refusal

- GIVEN a non-empty item
- WHEN the writer presses Backspace
- THEN the key is left to the browser and the item stays

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterFields.test.ts).
- Criteria: In an empty first item the next input is focused, in the only item the Add item button.
