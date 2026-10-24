---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-019
uuid: 17d07e62-0a0e-42df-b4f2-29e27b4e11b2
title: A field editor saves on Enter, change or leaving, only when the value
  changed
description: When a writer commits a field editor with Enter, with a checkbox
  change or by moving focus out of it, the extension SHALL post a save only when
  the value differs from the original.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-004
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A field editor saves on Enter, change or leaving, only when the value changed

### Normative behavior

When a writer commits a field editor with Enter, with a checkbox change or by moving focus out of it, the extension SHALL post a save only when the value differs from the original.

### Scenario: Nominal

- GIVEN a text field editor whose value was changed
- WHEN the writer moves focus out of the editor
- THEN one previewFrontmatterSave is posted; focus moving to the editor's own field menu or to Set to null does not save

### Scenario: Boundary or refusal

- GIVEN a field editor whose value is unchanged
- WHEN the writer presses Enter or leaves the editor
- THEN the editor closes and nothing is posted

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterEditor.test.ts).
- Criteria: Tests frontmatter blur toward the field actions does not save.
