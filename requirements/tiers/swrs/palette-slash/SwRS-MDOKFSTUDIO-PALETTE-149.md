---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-149
uuid: f92b06ae-c6c6-48a0-9947-1eef4dff5e5d
title: A chosen bibliography key is written as a cite role
description: When the writer chooses a key in the Citation list, the extension
  SHALL write {cite} with the key in backticks in place of the selection, and
  produce no edit for a key that is empty or that holds a blank, a comma, a
  backtick, an angle bracket or a line break.
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-013
depends_on:
- SwRS-MDOKFSTUDIO-PALETTE-039
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/editActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
---

## A chosen bibliography key is written as a cite role

### Normative behavior

When the writer chooses a key in the Citation list, the extension SHALL write {cite} with the key in backticks in place of the selection, and produce no edit for a key that is empty or that holds a blank, a comma, a backtick, an angle bracket or a line break.

### Scenario (nominal): Key chosen

- GIVEN the text claim and the key smith2024
- WHEN the action runs
- THEN the text is claim {cite}`smith2024` with the caret after it, and a selection is replaced

### Scenario (refusal): Invalid key

- GIVEN a key that contains a blank or a comma
- WHEN the action runs
- THEN no edit is produced

### Scenario (boundary): Keys that give no edit

| Input | Outcome |
| --- | --- |
| the key bad key (a blank) | no edit |
| a key with a comma | no edit |
| no key, or an empty key | no edit |
| a key with a backtick | no edit |
| a key with an angle bracket | no edit |
| a key with a line break | no edit |
| the key smith2024 over the selection [text] | the selection is replaced by {cite}`smith2024` with the caret after it |

### Related requirements

- SwRS-MDOKFSTUDIO-PALETTE-183: the host scan that lists the keys of the Citation list.
- SwRS-MDOKFSTUDIO-PALETTE-039: the edit is one undo step (a palette action edits in one undo step).

### Verification notes

- Method: test/page/modules/editActions.test.ts (T30: cite inserts {cite} with the chosen key; checks the nominal, refusal and boundary scenarios), with its requirement markers in test/page/modules/editActions.test.ts
- Criteria: An empty key or one with a blank, a comma, a backtick, an angle bracket or a line break gives no edit; a selection is replaced and the caret follows the role.
