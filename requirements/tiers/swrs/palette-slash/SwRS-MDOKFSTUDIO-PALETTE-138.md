---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-138
uuid: 806a9c0f-5942-4477-8956-0bbc523aa4c4
title: Key (MyST) wraps the selection in the kbd role
description: When the writer presses Key (MyST), the extension SHALL wrap the
  selection in the kbd role, or insert the role with the sample Ctrl+K selected
  when nothing is selected, and make no edit for a selection that contains a
  backtick.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-021
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
superseded_by:
- SwRS-MDOKFSTUDIO-PALETTE-276
---

## Key (MyST) wraps the selection in the kbd role

### Normative behavior

When the writer presses Key (MyST), the extension SHALL wrap the selection in the kbd role, or insert the role with the sample Ctrl+K selected when nothing is selected, and make no edit for a selection that contains a backtick.

### Scenario (nominal): Wrap

- GIVEN the selected word Ctrl
- WHEN Key (MyST) is pressed
- THEN the word is wrapped in the kbd role

### Scenario (nominal): Sample

- GIVEN no selection
- WHEN Key (MyST) is pressed
- THEN `{kbd}` with the sample Ctrl+K is inserted with Ctrl+K selected

### Scenario (refusal): Backtick in the selection

- GIVEN a selection that contains a backtick
- WHEN Key (MyST) is pressed
- THEN no edit is produced

### Scenario (boundary): Cell and existing markup

| Input | Outcome |
| --- | --- |
| Key (MyST) pressed in a table cell | The action works |
| Key (MyST) pressed on text that already has markup | Unlike Key, it never removes existing markup |

### Verification notes

- Method: test/page/modules/editActions.test.ts, through test/page/modules/editActions.test.ts (unit test "roleKbd wraps the selection in {kbd}, or inserts a sample key": scenarios Wrap, Sample and Backtick in the selection); the same file, unit test "ref, doc, cite, dropdown, tableCaption and roleKbd are myst-only without shortcut" (the block and cell scopes of roleKbd: the cell row of Cell and existing markup; the row on existing markup is untested)
- Criteria: The action works in a table cell and, unlike Key, never removes existing markup.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-021](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-021.md): A writer inserts MyST constructs
- Superseded by:
  - [SwRS-MDOKFSTUDIO-PALETTE-276](SwRS-MDOKFSTUDIO-PALETTE-276.md): Inline marker buttons toggle their markers around the selection
<!-- okf:links:end -->
