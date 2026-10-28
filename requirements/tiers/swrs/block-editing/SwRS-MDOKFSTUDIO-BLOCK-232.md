---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-232
uuid: 1b9a08d2-d04a-4e9e-b9c8-8e6d143a8898
title: Text edits apply in offset order
description: When several text edits planned on the same text are applied,
  applyTextEdits SHALL apply them in offset order whatever the order they come
  in.
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-025
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
---

## Text edits apply in offset order

### Normative behavior

When several text edits planned on the same text are applied, applyTextEdits SHALL apply them in offset order whatever the order they come in.

### Scenario: Out of order

- GIVEN two edits given in reverse order
- WHEN they are applied
- THEN the result is the same as for the ordered edits

### Scenario: Empty list

- GIVEN no edit
- WHEN they are applied
- THEN the text is returned unchanged

### Verification notes

- Method: Unit test `text edits apply in offset order, whatever order they come in` in test/core/edits/textEdit.test.ts.
- Criteria: The sort is by start then end.
