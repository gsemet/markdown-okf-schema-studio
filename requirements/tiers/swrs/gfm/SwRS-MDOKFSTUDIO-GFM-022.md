---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-022
uuid: 68f441fe-d64b-441d-9252-e0ad3a257bdf
title: A checkbox toggle is one undo step
description: When a checkbox toggle is applied, the extension SHALL apply it as
  a single undo step of the source document.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-003
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-BLOCK-058; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-BLOCK-058
---

## A checkbox toggle is one undo step

### Normative behavior

When a checkbox toggle is applied, the extension SHALL apply it as a single undo step of the source document.

### Scenario: Single undo

- GIVEN a toggled checkbox in a document shown in a source editor
- WHEN one undo is invoked
- THEN the original source is restored

### Scenario: No visible editor

- GIVEN no editor showing the document
- WHEN a checkbox is toggled
- THEN the edit is still applied to the document as one undoable step

### Verification notes

- Method: Integration suite run() in test/integration/checkboxToggle.test.ts (real window). Untested: the no-editor path.
- Criteria: One undo restores the source in both cases.
