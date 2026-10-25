---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-125
uuid: cfe0c60e-be62-4d57-b3fa-5a50d875eea8
title: Footnote adds a numbered reference and an empty definition at the end
description: When the writer presses Footnote, the extension SHALL add `[^n]`
  after the selection and an empty definition `[^n]:` at the end of the text,
  after the definitions already there, with the caret in it, where n is one more
  than the highest numeric label in use.
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/blockEditActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
---

## Footnote adds a numbered reference and an empty definition at the end

### Normative behavior

When the writer presses Footnote, the extension SHALL add `[^n]` after the selection and an empty definition `[^n]:` at the end of the text, after the definitions already there, with the caret in it, where n is one more than the highest numeric label in use.

### Scenario (nominal): Next number

- GIVEN a text that uses the labels [^1] and [^2]
- WHEN Footnote is pressed
- THEN the mark `[^3]` and the definition line `[^3]:` are added and the caret is after the definition marker

### Scenario (boundary): Named labels

- GIVEN a text with only named labels
- WHEN Footnote is pressed
- THEN the number is 1, because named labels are not counted

### Verification notes

- Method: test/page/modules/editActions.test.ts (T26: footnote takes the next free number and writes the definition at the end; footnote with named labels counts only numbers and inserts after a selection; scenarios next number, named labels)
- Criteria: Trailing blanks of the text are kept after the definition.
