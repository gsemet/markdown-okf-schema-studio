---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-268
uuid: 486ff87b-c795-447a-ad31-9e6f60ca307f
title: Typing or pasting in a blank-lines block writes the block in place of the
  run
description: When the writer types a block in a blank-lines block, or pastes in
  it, the extension SHALL write the block in place of the run with one separator
  on each side in one text edit, write nothing for an empty Done, restore the
  run on Cancel, keep the editor open across an autosave re-render, and refuse a
  stale run.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-011
- StRS-MDOKFSTUDIO-BLOCK-025
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/mapping/blockRange.ts
- src/core/mapping/insertion.ts
- src/page/features/blankLines.ts
- src/page/features/blockSelectionView.ts
- src/session/features/blockEdits.ts
tested_in_files:
- test/core/mapping/blockRange.test.ts
- test/core/mapping/insertion.test.ts
- test/core/protocol/pageToHost.test.ts
- test/integration/blankLines.test.ts
- test/page/runtimeBlankLines.test.ts
- test/session/blankRunHost.test.ts
default_owner_email: gaetan@xeberon.net
---

## Typing or pasting in a blank-lines block writes the block in place of the run

### Normative behavior

When the writer types a block in a blank-lines block, or pastes in it, the extension SHALL write the block in place of the run with one separator on each side in one text edit, write nothing for an empty Done, restore the run on Cancel, keep the editor open across an autosave re-render, and refuse a stale run.

### Scenario: Typing writes the block in place of the run

- GIVEN a run of three blank lines between two blocks and its editor open
- WHEN the writer types a block, then keeps typing across an autosave
- THEN the host replaces the run with the block and one blank line on each side in one text edit, and later saves replace that same block

### Scenario: Empty Done, Cancel and a paste

- GIVEN the same editor, or a paste on the blank-lines block
- WHEN Done is pressed with no text, Cancel is pressed after an autosave, or a block is pasted
- THEN an empty Done changes nothing, Cancel puts the run back, and the paste leaves one blank line on each side

### Scenario: A stale run

- GIVEN a run that changed or never was a run
- WHEN the editor is opened or saved
- THEN the host refuses it with an error and the document does not change

### Verification notes

- Method: test/session/blankRunHost.test.ts (LF and CR LF, empty Done, Cancel, paste, stale), test/core/mapping/insertion.test.ts and blockRange.test.ts (planBlankRunInsertion, planBlankRunPaste), test/core/protocol/pageToHost.test.ts (the fields).
- Criteria: one TextEdit; line endings kept; the editor of an open run survives refresh().

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-011](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-011.md): A writer adds blocks and starts an empty document from the preview
  - [StRS-MDOKFSTUDIO-BLOCK-025](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-025.md): Preview edits land exactly, in one undo step, keep line endings, or are refused with a reason
<!-- okf:links:end -->
