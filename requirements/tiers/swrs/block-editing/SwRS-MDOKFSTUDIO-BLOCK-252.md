---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-252
uuid: 0c4095d0-5339-46a2-99f6-8f490b0e9013
title: "Overlapping or out-of-range planned edits leave the document unchanged"
description: "When the edits planned for a move, a cut or a paste overlap each other
  or lie outside the text, the extension SHALL refuse the operation and leave the
  document unchanged."
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
---

## Overlapping or out-of-range planned edits leave the document unchanged

### Normative behavior

When the edits planned for a move, a cut or a paste overlap each other or lie outside the text, the extension SHALL refuse the operation and leave the document unchanged.

### Scenario: Edits in any order

- GIVEN two non-overlapping edits planned in reverse order
- WHEN they are applied
- THEN the result is the same as for the ordered edits

### Scenario: Overlap or outside

- GIVEN two overlapping edits, or an edit whose end is beyond the text
- WHEN they are applied
- THEN the operation is refused with a range error and nothing is written

### Verification notes

- Method: Unit tests `text edits apply in offset order, whatever order they come in` and `overlapping or out-of-range text edits are refused` in test/core/edits/textEdit.test.ts. The refusal is a thrown RangeError of applyTextEdits; no integration test reaches it.
- Criteria: Non-integer, negative, reversed and overlapping offsets are all refused.
