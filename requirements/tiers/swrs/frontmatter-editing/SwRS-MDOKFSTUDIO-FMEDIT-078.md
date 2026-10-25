---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-078
uuid: 3325e283-3f56-4329-92ee-5264f712208e
title: Cmd or Ctrl+Enter in a list item saves the list
description: When a writer presses Cmd or Ctrl+Enter in a list item input, the
  extension SHALL save the list.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-010; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMEDIT-010
---

## Cmd or Ctrl+Enter in a list item saves the list

### Normative behavior

When a writer presses Cmd or Ctrl+Enter in a list item input, the extension SHALL save the list.

### Scenario: Nominal

- GIVEN a list editor with items a and b
- WHEN the writer presses Cmd or Ctrl+Enter in an item
- THEN one previewFrontmatterSave with the items as strings is posted

### Scenario: Boundary or refusal

- GIVEN the same editor
- WHEN the writer presses Enter with Shift, or during IME composition
- THEN the list is not touched and nothing is posted

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterFields.test.ts).
- Criteria: Tests Cmd or Ctrl+Enter in a list item saves the list; Enter while composing or with Shift does not touch it.
