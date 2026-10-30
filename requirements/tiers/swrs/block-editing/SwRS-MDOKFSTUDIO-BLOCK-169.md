---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-169
uuid: 9155e6f3-a538-443d-9375-571ff1ef5a82
title: "Cut removes the selected blocks with one blank separator"
description: "When a writer cuts selected blocks, the host SHALL put their Markdown
  on the clipboard and delete them together with their blank separator in the line
  breaks of the document, so that no gap of two blank lines and no glued blocks are
  left, and answering that nothing was removed when the document changed during the
  clipboard write."
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-016
- StRS-MDOKFSTUDIO-BLOCK-006
- StRS-MDOKFSTUDIO-BLOCK-025
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-BLOCK-058
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-065
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/mapping/blockRange.ts
- src/page/features/blockSelectionView.ts
- src/session/features/sourceEdits.ts
tested_in_files:
- test/core/mapping/blockRange.test.ts
- test/page/runtimeBlockSelection.test.ts
- test/session/blockReq.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## Cut removes the selected blocks with one blank separator

### Normative behavior

When a writer cuts selected blocks, the host SHALL put their Markdown on the clipboard and delete them together with their blank separator in the line breaks of the document, so that no gap of two blank lines and no glued blocks are left, and answering that nothing was removed when the document changed during the clipboard write.

### Scenario (nominal): Middle block

- GIVEN a list between two paragraphs
- WHEN the list is cut
- THEN the Markdown of the list is on the clipboard, the list and one blank separator are gone and the paragraphs stay one blank line apart

### Scenario (boundary): Where the cut span sits in the document

| Input | Outcome |
| --- | --- |
| A span that touches the block above and is followed by a blank line | The blank line after it stays so that the neighbours remain apart |
| The first block of a document with three blocks | No blank line starts the body after the cut |
| The last block of a document with three blocks | The blank line before the last block goes with it |
| The only block of the body | The body is empty |
| The last block of a document without a final line break | The document still has no final line break |

A cut never leaves three line breaks in a row and never merges two paragraphs.

### Scenario (boundary): Line breaks of what remains

| Input | Outcome |
| --- | --- |
| A document with CR LF line breaks, a block is cut | No bare LF appears in the remaining text |
| A document with LF line breaks, a block is cut | No CR appears |

### Scenario (nominal): The block after a cut keeps its place on the screen

| Input | Outcome |
| --- | --- |
| A cut with pinViewportTop 200 and a block after the span | The host stores a pin for the first line of the cut span with that viewport top, and the next render puts the line of the span at viewport top 200 |
| A cut of the last block, no block follows the span | No pin is stored |

### Scenario (refusal): The document changed during the clipboard write

| Input | Outcome |
| --- | --- |
| A cut whose clipboard write is pending while the document is edited | When the write completes, the answer is ok false with "The document changed while cutting. The blocks are on the clipboard, nothing was removed." and the document is unchanged |
| No change during the write | When the write completes, the blocks are removed |

### Scenario (nominal): A successful cut clears the block selection

- GIVEN a block selection and a cut or a paste answered ok true
- WHEN the answer arrives
- THEN the page clears the selection and its announcement

### Scenario (refusal): A refused cut keeps the block selection

- GIVEN a selection and a cut answered ok false
- WHEN the answer arrives
- THEN the selection is kept and the reason is shown

### Related requirements

- SwRS-MDOKFSTUDIO-BLOCK-166: copy shares the selection and the clipboard path
- SwRS-MDOKFSTUDIO-BLOCK-124: ranges that do not match the document, and the frontmatter, are refused
- SwRS-MDOKFSTUDIO-BLOCK-127: an included block is never cut
- SwRS-MDOKFSTUDIO-BLOCK-242: the accepted shape of previewBlocksCut

### Verification notes

- Method: test/core/mapping/blockRange.test.ts (middle block, touching block above, first, last, only block and no final newline, CR LF and LF line breaks: `cutting a middle block removes it with one separator`, `cutting never glues a block to the one after the span`, `a cut never leaves three blank lines in a row`, `cutting the first block leaves no blank line at the top`, `cutting the last block removes the blank line before it`, `cutting the last block of a document without a final newline keeps it without one`, `cutting the only block empties the body`, `cutting keeps CRLF line breaks of what remains`).
- Method: test/integration/blockClipboard.test.ts (middle block with one undo restoring it, last block).
- Method: test/session/blockReq.requirements.test.ts (pin only when a block follows the span: `a cut stores a pin for the first line of the span only when a block follows it`; changed document: `a cut is refused when the document changed while the clipboard was written`).
- Method: test/page/runtimeBlockSelection.test.ts (`T40: a copy answer says so and a cut answer clears the selection`; the paste path shares the branch and is not asserted; the refused-cut selection case is not asserted by this test).
- Criteria: The resulting text has no run of three line breaks and no merged paragraphs; storePendingPin is called only when followingLine is defined; the revision of the document is compared with the one of the request after the write; receiveBlocksResult clears the selection for every answered op except copy.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-016](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-016.md): A writer selects blocks and copies, cuts and pastes them as Markdown
  - [StRS-MDOKFSTUDIO-BLOCK-006](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-006.md): Typed text is saved, survives updates and is never lost on leaving
  - [StRS-MDOKFSTUDIO-BLOCK-025](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-025.md): Preview edits land exactly, in one undo step, keep line endings, or are refused with a reason
- Depends on:
  - [SwRS-MDOKFSTUDIO-BLOCK-041](SwRS-MDOKFSTUDIO-BLOCK-041.md): One edit at a time: an open editor blocks other edits, opens and refreshes
  - [SwRS-MDOKFSTUDIO-BLOCK-058](SwRS-MDOKFSTUDIO-BLOCK-058.md): Every host source edit is one undo step, renders once and reports a failed apply
  - [SwRS-MDOKFSTUDIO-TRUST-005](../trust-security/SwRS-MDOKFSTUDIO-TRUST-005.md): The host refuses every write request of a read-only preview with a reason
  - [SwRS-MDOKFSTUDIO-TRUST-065](../trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
<!-- okf:links:end -->
