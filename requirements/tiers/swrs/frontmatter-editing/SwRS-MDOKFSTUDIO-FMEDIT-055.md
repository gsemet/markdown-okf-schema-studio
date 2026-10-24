---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-055
uuid: 2fa293cf-9ed3-487f-adbf-5d8c8c37cb4e
title: Each frontmatter save is one document edit
description: When the host applies a frontmatter save, the extension SHALL apply
  it as one edit of the document so that one Undo reverts it.
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

## Each frontmatter save is one document edit

### Normative behavior

When the host applies a frontmatter save, the extension SHALL apply it as one edit of the document so that one Undo reverts it.

### Scenario: Nominal

- GIVEN a value save, an add, a rename or a remove
- WHEN the host applies it
- THEN exactly one text edit is passed to the document

### Scenario: Boundary or refusal

- GIVEN the document in the text editor after the save
- WHEN the writer presses Undo once
- THEN the document returns to its text before the save

### Verification notes

- Method: Inspection of planFrontmatterSave and handleSave; no automated test asserts the undo step.
- Criteria: applyEdits receives a single-element list.
