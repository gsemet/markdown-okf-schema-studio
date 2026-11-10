---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-119
uuid: 769db60a-e46f-485b-a100-9995353ded20
title: An outside change of the table under an open cell editor closes the
  editor and shows the buffer
description: When the document changes outside the preview (an undo, a redo, a
  revert of the file or a write by another tool) over the source lines of the
  table whose cell editor the page has open, the extension SHALL let the render
  of the new buffer reach the page at once, release the host's edit of that
  table without writing, and have the page close the cell editor without saving
  it, so the table shows what the buffer holds.
project: markdown-okf-schema-studio
scope: table-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/state/editLock.ts
- src/page/features/blockEditor.ts
- src/page/features/contentPatch.ts
- src/session/features/blockEdits.ts
- src/session/hostEvents.ts
tested_in_files:
- test/core/protocol/pageStateMessages.test.ts
- test/core/state/editLock.test.ts
- test/host/previewTiming.test.ts
- test/integration/realInput/tableStaleRender.ts
- test/page/runtimeTableCellStale.test.ts
default_owner_email: gaetan@xeberon.net
---

## An outside change of the table under an open cell editor closes the editor and shows the buffer

### Normative behavior

When the document changes outside the preview (an undo, a redo, a revert of the file or a write by another tool) over the source lines of the table whose cell editor the page has open, the extension SHALL let the render of the new buffer reach the page at once, release the host's edit of that table without writing, and have the page close the cell editor without saving it, so the table shows what the buffer holds.

### Scenario (nominal): An undo, a redo or a revert under an open cell editor

- GIVEN a cell editor open in a table (its text autosaved or not) and the writer undoing, redoing or reverting the file in the text editor, or another tool rewriting the document, so that the change overlaps the source lines of that table
- WHEN the change reaches the host
- THEN the host lets the render of the new buffer reach the page at once, drops a render that waited for the editor, and releases its edit of the table without writing; the page applies the content patch, which closes the cell editor without a save and without a cancel message, and the table shows what the buffer holds (unit tests test/host/previewTiming.test.ts "an undo inside the table of an open cell editor reaches the page at once", "a revert-like change that is neither an undo nor typed also reaches an open cell editor's table", "an undo inside the table releases a held host edit without writing and renders")

### Scenario (boundary): Which changes close the editor

| Input | Outcome |
| --- | --- |
| A change outside the table (another block, above or below it) | The render waits for the editor as in SwRS-MDOKFSTUDIO-BLOCK-193; a change above the table moves the range the host follows, so a later change inside the table is still recognised |
| Text typed by the writer in the source (including a change that touches the cursor before VS Code has reported any keystroke, which may be the first one), or an edit the preview applied itself | The render keeps waiting; the editor stays open |
| An inline editor that is not a table cell editor (a prose block editor) | Not affected: the conflict of SwRS-MDOKFSTUDIO-BLOCK-191 applies, the editor stays open with the reader's text |
| A cell editor that never saved (no host edit) | The change is recognised from the table range the host recorded when the page opened the editor |

### Scenario (nominal): A cell left with Tab is rebuilt

- GIVEN a table whose cell was left with Tab, an arrow key or a click, so that the page wrote the text just typed into it
- WHEN the next content patch carries the same table HTML as the render the page started from (the buffer went back to that text)
- THEN the table is rebuilt from the patch and shows the buffer text, not the text typed in the cell (SwRS-MDOKFSTUDIO-LIFE-069)

### Related requirements

- SwRS-MDOKFSTUDIO-BLOCK-193: the render that waits while an inline editor is open, and its exception
- SwRS-MDOKFSTUDIO-BLOCK-191: the host edit that a conflicting change releases
- SwRS-MDOKFSTUDIO-TABLE-035: the cell left shows the text just typed

### Verification notes

- Method: test/host/previewTiming.test.ts (the rows of the boundary table, with the fake VS Code module and a scripted page), test/core/state/editLock.test.ts (the recorded range, rebased by a change before the table and reported overlapping by a change inside it), test/page/runtimeTableCellStale.test.ts and test/page/modules/contentMorph.test.ts (the rebuild), test/integration/realInput/tableStaleRender.ts (real mouse and keys, run by CI only).
- Criteria: the page posts cellEditor true on the open of a cell editor; the host records the table range at open and follows it through each change; an outside change that overlaps it releases the lock and the render is posted without a previewEditorWatch; ContentMorph.invalidate forgets the key of a block the page wrote into.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TABLE-001](../../strs/table-editing/StRS-MDOKFSTUDIO-TABLE-001.md): A writer edits a table cell in place and never loses the text
<!-- okf:links:end -->
