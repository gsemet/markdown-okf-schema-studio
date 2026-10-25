---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-135
uuid: f28f95e9-5932-4d5e-b3ed-cffe97bfdb04
title: Subscript and Superscript wrap the selection in a role
description: When the writer presses Subscript or Superscript, the extension
  SHALL wrap the selection in the sub or sup role, put the caret between the
  quotes when nothing is selected, and make no edit for a selection that
  contains a backtick or a line break.
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
- src/page/modules/inlineEditActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
---

## Subscript and Superscript wrap the selection in a role

### Normative behavior

When the writer presses Subscript or Superscript, the extension SHALL wrap the selection in the sub or sup role, put the caret between the quotes when nothing is selected, and make no edit for a selection that contains a backtick or a line break.

### Scenario (nominal): Wrap

- GIVEN the selected 2 in H2O
- WHEN Subscript is pressed
- THEN the 2 is wrapped in the sub role and stays selected

### Scenario (nominal): In a table cell

- GIVEN the caret in a table cell editor
- WHEN Subscript or Superscript is pressed
- THEN both buttons work as in a block editor

### Scenario (refusal): Refusal

- GIVEN a selection that contains a backtick
- WHEN Superscript is pressed
- THEN no edit is produced

### Verification notes

- Method: test/page/modules/editActions.test.ts, through test/page/modules/editActions.test.ts (unit tests "sub and sup wrap the selection in a role; empty puts the caret inside": scenarios Wrap and Refusal; "the MyST actions are myst-only with no shortcut; sub and sup also work in a cell": scenario In a table cell)
- Criteria: Both buttons also work in a table cell.
