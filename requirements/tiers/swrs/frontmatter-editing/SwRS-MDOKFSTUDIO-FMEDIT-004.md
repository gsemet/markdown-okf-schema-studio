---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-004
uuid: b37a820d-e7e7-4737-83a2-46291d188e59
title: "Enter saves a one-line text value"
description: "When a writer presses Enter in the one-row text box of a text field
  holding a one-line value, the extension SHALL save the value."
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

## Enter saves a one-line text value

### Normative behavior

When a writer presses Enter in the one-row text box of a text field holding a one-line value, the extension SHALL save the value.

### Scenario: Nominal

- GIVEN a text field title holding a one-line value, its editor open
- WHEN the writer presses Enter
- THEN one previewFrontmatterSave is posted with the typed value

### Scenario: Boundary or refusal

- GIVEN the same editor
- WHEN the writer presses Enter during IME composition
- THEN the key is ignored and nothing is posted

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterEditor.test.ts).
- Criteria: Tests Enter saves a one-line frontmatter text field.
