---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-269
uuid: 59c6b771-51fb-499e-81d6-3b167570b250
title: Removing a blank-lines block keeps one separator
description: When the writer deletes a blank-lines block with Delete, Backspace
  or its Delete block button, the extension SHALL remove the extra blank lines
  of the run and keep one separator in one text edit and one undo step, keep the
  line endings, refuse a stale run next to the block, and select the block that
  followed the run, or the list that held a run inside a list. A run of empty
  quote lines keeps its first line byte for byte, and the removal keeps the
  final line break of the text, or its absence.
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

## Removing a blank-lines block keeps one separator

### Normative behavior

When the writer deletes a blank-lines block with Delete, Backspace or its Delete block button, the extension SHALL remove the extra blank lines of the run and keep one separator in one text edit and one undo step, keep the line endings, refuse a stale run next to the block, and select the block that followed the run, or the list that held a run inside a list. A run of empty quote lines keeps its first line byte for byte, and the removal keeps the final line break of the text, or its absence.

### Scenario: Removing a run

- GIVEN a selected blank-lines block of three lines
- WHEN the writer presses Delete or Backspace, or clicks its Delete block button
- THEN the host keeps one blank line in one text edit and one undo step, answers previewBlocksResult with op delete-blank-lines, and the following block is selected (else the one above, else Start writing)

### Scenario: Removing a run inside a list

- GIVEN a run between two list items, or inside a list item, and its blank-lines block selected
- WHEN the writer presses Delete or Backspace, or clicks its Delete block button
- THEN line `line` of the run stays, nothing else changes, the list is still one list, and the selection goes to the list that held the run

### Scenario: Refusals

- GIVEN a run the text no longer has, a failed edit, or an open block edit on the host
- WHEN previewBlankRunDelete arrives
- THEN the document does not change and the refusal is answered

### Verification notes

- Method: test/session/blankRunHost.test.ts (LF, CR LF, end of body, stale, failed, held), test/core/protocol/pageToHost.test.ts (the message).
- Method: the list cases of test/session/blankRunInListHost.test.ts and test/core/mapping/blankRunInList.test.ts (a removal between items or inside an item), test/page/runtimeBlankLines.test.ts (the selection goes to the list).
- Criteria: one TextEdit through applyWrittenEdits; the viewport is pinned on the run.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-011](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-011.md): A writer adds blocks and starts an empty document from the preview
  - [StRS-MDOKFSTUDIO-BLOCK-025](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-025.md): Preview edits land exactly, in one undo step, keep line endings, or are refused with a reason
<!-- okf:links:end -->
