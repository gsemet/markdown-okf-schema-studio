---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-264
uuid: 5d0d9d3a-4e3e-450a-a18a-3b95e27218f8
title: An emptied top-level block or list item is deleted with its separator
  when the writer commits it
description: When the writer erases the whole text of the editor of a top-level
  body block or of a list item and commits it (Done, Ctrl or Cmd+Enter, or a
  blur that commits), the host SHALL delete that block with its trailing blank
  lines and one separator in one edit, instead of writing a placeholder line,
  and keep the document's line endings and its final line break.
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
  title: A paragraph in the middle
- id: S2
  title: Edges of the deletion
- id: S3
  title: One edit before an autosave, two after
- id: S4
  title: Cases that keep the placeholder line
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/edits/sourceEdits.ts
- src/page/features/blockEditor.ts
- src/session/features/blockEdits.ts
tested_in_files:
- test/core/edits/blocksDelete.test.ts
- test/integration/emptyBlocks.test.ts
- test/page/runtimeBlockDelete.test.ts
- test/session/emptiedBlockDelete.test.ts
default_owner_email: gaetan@xeberon.net
---

## An emptied top-level block or list item is deleted with its separator when the writer commits it

### Normative behavior

When the writer erases the whole text of the editor of a top-level body block or of a list item and commits it (Done, Ctrl or Cmd+Enter, or a blur that commits), the host SHALL delete that block with its trailing blank lines and one separator in one edit, instead of writing a placeholder line, and keep the document's line endings and its final line break.

### Scenario S1: A paragraph in the middle

- GIVEN the document `# Title`, `First.` and `Second paragraph.` separated by blank lines, and the editor of "First." erased
- WHEN the writer commits it, before or after the autosave of the empty text reached the document
- THEN the document is `# Title`, a blank line, `Second paragraph.` and the final line break

### Scenario S2: Edges of the deletion

- GIVEN an emptied first block, last block, tight list item, loose list item, or a block whose range ends on blank lines, in a document with CR LF or a lone CR
- WHEN the writer commits it
- THEN no blank line is left at the start, the block above keeps the final line break, a tight list stays tight, a loose list keeps one blank line between its items, the trailing blank lines go with the block, and the document's line ending is kept

### Scenario S3: One edit before an autosave, two after

- GIVEN an erased editor
- WHEN the writer commits it before any autosave reached the document, or after one wrote the placeholder line
- THEN one edit deletes the block (one undo brings it back), or the autosave and the deletion are two edits (two undos)

### Scenario S4: Cases that keep the placeholder line

- GIVEN a block inside a list item, an alert, a quote, an admonition or another container, an item left as `- `, an autosave of an empty text, Escape or Cancel, or held lines that no longer match the block
- WHEN the writer commits it
- THEN no deletion happens: the placeholder line is written, or the original text is written back

### Verification notes

- Method: test/core/edits/sourceEdits.test.ts (`planEmptiedBlockRemoval`: middle, first and last block, tight and loose list item, range ending on a blank line, CR LF and lone CR).
- Method: test/session/ (the final save with `deleteWhenEmpty`, before and after an autosave, and without the field).
- Method: test/page/runtimeBlockEditor.test.ts (the final save carries `deleteWhenEmpty` for a top-level block and a list item only, never on an autosave).
- Method: test/integration (a real file in LF and CR LF, undo with and without an autosave).
- Criteria: the plan is one edit that starts at the block's start, so the autosave's edit is included in it; `planCut` rules give the separator; only a whitespace-only editor text deletes.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-011](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-011.md): A writer adds blocks and starts an empty document from the preview
  - [StRS-MDOKFSTUDIO-BLOCK-025](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-025.md): Preview edits land exactly, in one undo step, keep line endings, or are refused with a reason
<!-- okf:links:end -->
