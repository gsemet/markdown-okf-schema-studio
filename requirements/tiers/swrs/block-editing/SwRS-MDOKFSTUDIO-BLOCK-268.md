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
  stale run. A block written in place of a run inside a list takes the content
  indent of the item (CommonMark's content column), or the item's own indent
  when the run is between two items and the first line of the block starts with
  a list marker; the host checks the item line and refuses it as stale when it
  is not a list item line.
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
- src/core/edits/sourceEdits.ts
- src/core/mapping/blockRange.ts
- src/core/mapping/insertion.ts
- src/core/mapping/listItemIndent.ts
- src/core/protocol/pageToHost.ts
- src/page/features/blankLines.ts
- src/page/features/blockSelectionView.ts
- src/page/features/contentPatch.ts
- src/session/features/blockEdits.ts
tested_in_files:
- test/core/mapping/blankRunInList.test.ts
- test/core/mapping/blockRange.test.ts
- test/core/mapping/insertion.test.ts
- test/core/mapping/listItemIndent.test.ts
- test/core/protocol/pageToHost.test.ts
- test/integration/blankLines.test.ts
- test/page/runtimeBlankLines.test.ts
- test/session/blankRunHost.test.ts
- test/session/blankRunInListHost.test.ts
- test/visual/blankLinesBlockScenarios.ts
- test/visual/capture_blank_lines_block.py
default_owner_email: gaetan@xeberon.net
---

## Typing or pasting in a blank-lines block writes the block in place of the run

### Normative behavior

When the writer types a block in a blank-lines block, or pastes in it, the extension SHALL write the block in place of the run with one separator on each side in one text edit, write nothing for an empty Done, restore the run on Cancel, keep the editor open across an autosave re-render, and refuse a stale run. A block written in place of a run inside a list takes the content indent of the item (CommonMark's content column), or the item's own indent when the run is between two items and the first line of the block starts with a list marker; the host checks the item line and refuses it as stale when it is not a list item line.

### Scenario: Typing writes the block in place of the run

- GIVEN a run of three blank lines between two blocks and its editor open
- WHEN the writer types a block, then keeps typing across an autosave
- THEN the host replaces the run with the block and one blank line on each side in one text edit, and later saves replace that same block

### Scenario: Empty Done, Cancel and a paste

- GIVEN the same editor, or a paste on the blank-lines block
- WHEN Done is pressed with no text, Cancel is pressed after an autosave, or a block is pasted
- THEN an empty Done changes nothing, Cancel puts the run back, and the paste leaves one blank line on each side

### Scenario: A block typed inside a list item stays in the item

- GIVEN a run between two list items, or inside a list item, and its editor open
- WHEN the writer types "More" or "- c" and the host saves or pastes it
- THEN "More" is indented to the item and stays in it, "- c" between two items is an item at the item level, "- c" inside an item is a nested list of that item, and the blank lines of the block get no indent

### Scenario: A stale run

- GIVEN a run that changed or never was a run, or an item line that is not a list item line
- WHEN the editor is opened or saved
- THEN the host refuses it with an error and the document does not change

### Verification notes

- Method: test/session/blankRunHost.test.ts (LF and CR LF, empty Done, Cancel, paste, stale), test/core/mapping/insertion.test.ts and blockRange.test.ts (planBlankRunInsertion, planBlankRunPaste), test/core/protocol/pageToHost.test.ts (the fields).
- Method: test/core/mapping/listItemIndent.test.ts and blankRunInList.test.ts (the indents in LF, CR LF and lone CR), test/session/blankRunInListHost.test.ts (save, paste and a stale item line in a list), test/integration/blankLines.test.ts (a real file).
- Criteria: one TextEdit; line endings kept; the editor of an open run survives refresh().

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-011](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-011.md): A writer adds blocks and starts an empty document from the preview
  - [StRS-MDOKFSTUDIO-BLOCK-025](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-025.md): Preview edits land exactly, in one undo step, keep line endings, or are refused with a reason
<!-- okf:links:end -->
