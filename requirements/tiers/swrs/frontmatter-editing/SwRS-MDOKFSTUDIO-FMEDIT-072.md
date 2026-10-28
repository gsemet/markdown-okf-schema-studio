---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-072
uuid: 7bf91ff4-66d6-41c4-92b0-1a1d57ab1eb6
title: Block selection and block moves ignore input while a field editor is open
description: While a field editor is open, the extension SHALL ignore the input
  that extends a block selection or moves a block.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-008
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-BLOCK-041; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-BLOCK-041
default_owner_email: gaetan@xeberon.net
---

## Block selection and block moves ignore input while a field editor is open

### Normative behavior

While a field editor is open, the extension SHALL ignore the input that extends a block selection or moves a block.

### Scenario: Nominal

- GIVEN a field editor open in edit mode
- WHEN the writer Shift+clicks a body block
- THEN no block is selected

### Scenario: Boundary or refusal

- GIVEN the same editor
- WHEN the writer presses a block move shortcut or a Shift+arrow selection key
- THEN nothing is selected or moved

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeBlockSelection.test.ts, test/page/runtimeBlockMoves.test.ts).
- Criteria: blockSelectionView and blockMoves return when activeFrontmatterEdit is set; the keys are also ignored inside a text box, a field and the property table.
