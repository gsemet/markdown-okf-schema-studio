---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-075
uuid: 904fd1ce-9724-4ab0-8d68-db104eb16ee8
title: Shift+Enter adds a line in a text field without saving
description: When a writer presses Shift+Enter in the text box of a text field,
  the extension SHALL add a line without saving.
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

## Shift+Enter adds a line in a text field without saving

### Normative behavior

When a writer presses Shift+Enter in the text box of a text field, the extension SHALL add a line without saving.

### Scenario: Nominal

- GIVEN a text field editor holding a one-line value
- WHEN the writer presses Shift+Enter
- THEN the key is left to the text box, which adds a line, and nothing is posted

### Scenario: Boundary or refusal

- GIVEN the same editor
- WHEN the writer presses Alt+Enter
- THEN nothing is posted either

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterEditor.test.ts).
- Criteria: Tests Enter saves a one-line frontmatter text field and Shift+Enter does not.
