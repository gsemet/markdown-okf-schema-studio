---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-268
uuid: 486ff87b-c795-447a-ad31-9e6f60ca307f
title: Typing or pasting in a blank-line block writes the text in place of that
  blank line
description: When the writer types a block in a blank-line block, or pastes in
  it, the extension SHALL write the text in place of that one blank line and
  keep the other blank lines, adding a blank line before or after the text only
  where the neighbouring line exists and is not blank, in one text edit, write
  nothing for an empty Done, restore the line on Cancel, keep the editor open
  across an autosave re-render and close it on the render that follows its final
  save, and refuse a stale line. A text written in place of a blank line inside
  a list takes the content indent of the item (CommonMark's content column), or
  the item's own indent when the line is between two items and the first line of
  the text starts with a list marker; the host checks the item line and refuses
  it as stale when it is not a list item line. A text written in place of a
  blank line inside a quote keeps the quote markers of the line, and one inside
  a directive, a panel, a definition or a footnote takes the indent of that
  container; the host checks the container line and refuses it as stale when it
  is not a line of that shape.
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
- src/core/mapping/blankRunContainer.ts
- src/core/mapping/blockRange.ts
- src/core/mapping/insertion.ts
- src/core/mapping/listItemIndent.ts
- src/core/mapping/quoteLine.ts
- src/core/protocol/pageToHost.ts
- src/page/features/blankLines.ts
- src/page/features/blankRunHosts.ts
- src/page/features/blockSelectionView.ts
- src/page/features/contentPatch.ts
- src/session/features/blockEdits.ts
tested_in_files:
- test/core/edits/blankRunContainerWrite.test.ts
- test/core/mapping/blankRunContainer.test.ts
- test/core/mapping/blankRunInList.test.ts
- test/core/mapping/blockRange.test.ts
- test/core/mapping/insertion.test.ts
- test/core/mapping/listItemIndent.test.ts
- test/core/mapping/quoteBlankRuns.test.ts
- test/core/protocol/pageToHost.test.ts
- test/integration/blankLines.test.ts
- test/page/runtimeBlankLines.test.ts
- test/page/runtimeBlankLinesContainers.test.ts
- test/session/blankRunHost.test.ts
- test/session/blankRunInContainerHost.test.ts
- test/session/blankRunInListHost.test.ts
- test/visual/blankLinesBlockScenarios.ts
- test/visual/capture_blank_lines_block.py
- test/visual/capture_blank_lines_containers.py
default_owner_email: gaetan@xeberon.net
---

## Typing or pasting in a blank-line block writes the text in place of that blank line

### Normative behavior

When the writer types a block in a blank-line block, or pastes in it, the extension SHALL write the text in place of that one blank line and keep the other blank lines, adding a blank line before or after the text only where the neighbouring line exists and is not blank, in one text edit, write nothing for an empty Done, restore the line on Cancel, keep the editor open across an autosave re-render and close it on the render that follows its final save, and refuse a stale line. A text written in place of a blank line inside a list takes the content indent of the item (CommonMark's content column), or the item's own indent when the line is between two items and the first line of the text starts with a list marker; the host checks the item line and refuses it as stale when it is not a list item line. A text written in place of a blank line inside a quote keeps the quote markers of the line, and one inside a directive, a panel, a definition or a footnote takes the indent of that container; the host checks the container line and refuses it as stale when it is not a line of that shape.

### Scenario: Typing writes the text in place of that blank line

- GIVEN three blank lines between two blocks, whose second and third are blank-line blocks, and the editor of the second open
- WHEN the writer types a block, then keeps typing across an autosave
- THEN the host replaces that one line with the text in one text edit and keeps the other blank lines, and later saves replace that same text

### Scenario: A separator only where needed

- GIVEN a blank-line block whose line is next to a block, at the end of the body, or at line 1 of a file without frontmatter
- WHEN the writer types in it
- THEN a blank line is added before or after the text only on the side where a neighbouring line exists and is not blank

### Scenario: Empty Done, Cancel and a paste

- GIVEN the same editor, or a paste on the blank-line block
- WHEN Done is pressed with no text, Cancel is pressed after an autosave, or a block is pasted
- THEN an empty Done changes nothing, Cancel puts the line back, and the paste replaces that one line, with a blank line added only where the neighbour is not blank

### Scenario: Done closes the editor

- GIVEN a blank-line block's editor with typed text
- WHEN the writer presses Done and the host writes the text and renders it
- THEN the editor closes, "Saving Markdown…" is gone and the text shows in place of that blank line

### Scenario: A block typed inside a list item stays in the item

- GIVEN a blank line between two list items, or inside a list item, and its editor open
- WHEN the writer types "More" or "- c" and the host saves or pastes it
- THEN "More" is indented to the item and stays in it, "- c" between two items is an item at the item level, "- c" inside an item is a nested list of that item, and the blank lines around the text get no indent

### Scenario: A stale run

- GIVEN a line that changed or never was a blank line, or an item line that is not a list item line
- WHEN the editor is opened or saved
- THEN the host refuses it with an error and the document does not change

### Verification notes

- Method: test/session/blankRunHost.test.ts (LF and CR LF, empty Done, Cancel, paste, stale), test/core/mapping/insertion.test.ts and blockRange.test.ts (planBlankRunInsertion and planBlankRunPaste of one line: the separators, the end of the body, line 1, a frontmatter-only body, quote runs), test/core/protocol/pageToHost.test.ts (the fields, endLine equal to line).
- Method: test/page/runtimeBlankLines.test.ts (Done in the editor of a run, at the top level and in a list, then the patch of the final save closes the editor; an error answer keeps it open), test/session/blankRunHost.test.ts (a final save that writes text asks for a render and posts no done).
- Method: test/core/mapping/listItemIndent.test.ts and blankRunInList.test.ts (the indents in LF, CR LF and lone CR), test/session/blankRunInListHost.test.ts (save, paste and a stale item line in a list), test/integration/blankLines.test.ts (a real file).
- Criteria: one TextEdit; line endings kept; the editor of an open run survives refresh() until its final save is posted; the patch after it closes the editor.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-011](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-011.md): A writer adds blocks and starts an empty document from the preview
  - [StRS-MDOKFSTUDIO-BLOCK-025](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-025.md): Preview edits land exactly, in one undo step, keep line endings, or are refused with a reason
<!-- okf:links:end -->
