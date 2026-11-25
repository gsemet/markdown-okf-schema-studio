---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-269
uuid: 59c6b771-51fb-499e-81d6-3b167570b250
title: Removing a blank-line block removes that one blank line
description: When the writer deletes a blank-line block with Delete, Backspace
  or its Delete block button, the extension SHALL remove that one blank line,
  keep the separator and the other blank lines in one text edit and one undo
  step, keep the line endings, refuse a stale line next to the block, and select
  the blank-line block now at that place, else the one just above it in the same
  run, else nothing, so that a further Delete or Backspace removes no text. A
  run of empty quote lines keeps its first line byte for byte, and the removal
  keeps the final line break of the text, or its absence.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-011
- StRS-MDOKFSTUDIO-BLOCK-025
scenarios:
- id: S1
  title: Removing a blank line
- id: S2
  title: The last blank line of a run
- id: S3
  title: Removing a blank line inside a list
- id: S4
  title: Refusals
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/edits/sourceEdits.ts
- src/core/mapping/blockRange.ts
- src/core/preview/styles/editModeStyles.ts
- src/core/protocol/pageToHost.ts
- src/page/features/blockSelectionView.ts
- src/session/features/sourceEdits.ts
tested_in_files:
- test/core/mapping/blankRunInList.test.ts
- test/core/mapping/blockRange.test.ts
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
default_owner_email: gaetan@xeberon.net
---

## Removing a blank-line block removes that one blank line

### Normative behavior

When the writer deletes a blank-line block with Delete, Backspace or its Delete block button, the extension SHALL remove that one blank line, keep the separator and the other blank lines in one text edit and one undo step, keep the line endings, refuse a stale line next to the block, and select the blank-line block now at that place, else the one just above it in the same run, else nothing, so that a further Delete or Backspace removes no text. A run of empty quote lines keeps its first line byte for byte, and the removal keeps the final line break of the text, or its absence.

### Scenario S1: Removing a blank line

- GIVEN a selected blank-line block, one of three shown
- WHEN the writer presses Delete or Backspace, or clicks its Delete block button
- THEN the host removes that one line in one text edit and one undo step, keeps the other blank lines, answers previewBlocksResult with op delete-blank-lines, and the blank-line block now at that place is selected (else the one just above it in the same run, else nothing)

### Scenario S2: The last blank line of a run

- GIVEN a selected blank-line block, the only one of its run
- WHEN the writer presses Delete, and then Delete or Backspace again
- THEN the first removes that line and nothing is selected afterwards, so the further key presses post nothing and remove no text

### Scenario S3: Removing a blank line inside a list

- GIVEN a blank line between two list items, or inside a list item, and its blank-line block selected
- WHEN the writer presses Delete or Backspace, or clicks its Delete block button
- THEN only that line goes, nothing else changes, the list is still one list, and the selection goes to the blank-line block now at that place in the same run, else the one just above it, else nothing

### Scenario S4: Refusals

- GIVEN a line the text no longer has as a blank line, a failed edit, or an open block edit on the host
- WHEN previewBlankRunDelete arrives
- THEN the document does not change and the refusal is answered

### Verification notes

- Method: test/session/blankRunHost.test.ts (LF, CR LF, end of body, stale, failed, held; one line removed), test/core/protocol/pageToHost.test.ts (the message, endLine equal to line).
- Method: the list cases of test/session/blankRunInListHost.test.ts and test/core/mapping/blankRunInList.test.ts (a removal between items or inside an item), test/page/runtimeBlankLines.test.ts (the selection after a delete: same line number, else the line above, else nothing, then Delete and Backspace post nothing), test/page/runtimeBlankLinesContainers.test.ts (the same in containers).
- Criteria: one TextEdit through applyWrittenEdits; the viewport is pinned on the run.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-011](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-011.md): A writer adds blocks and starts an empty document from the preview
  - [StRS-MDOKFSTUDIO-BLOCK-025](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-025.md): Preview edits land exactly, in one undo step, keep line endings, or are refused with a reason
<!-- okf:links:end -->
