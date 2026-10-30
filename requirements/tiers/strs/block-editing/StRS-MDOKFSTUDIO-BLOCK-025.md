---
type: StRS
id: StRS-MDOKFSTUDIO-BLOCK-025
uuid: 996e4b9c-9d5e-48eb-9deb-05e7354863f8
title: Preview edits land exactly, in one undo step, keep line endings, or are
  refused with a reason
description: When a writer's edit, move, cut or paste reaches the file, the
  Studio SHALL change exactly the lines the writer meant as one undo step with
  the line endings of the document and of the block kept, or refuse it with a
  reason the writer can read and leave the file and the clipboard as they were.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: approved
status: stable
approved_by: gaetan@xeberon.net
approved_at: '2026-10-28T00:00:00Z'
verified:
  by: human:gaetan@xeberon.net
  at: '2026-10-28T00:00:00Z'
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I trust that every change I make from the preview lands
  on the lines I meant, reverts with one undo and keeps the line endings of my
  document, or is refused with a reason, never landing on the wrong text; I am
  told why when an edit, move or paste cannot be done, and my document and
  clipboard are left untouched.
derived_by:
- SwRS-MDOKFSTUDIO-BLOCK-003
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-BLOCK-042
- SwRS-MDOKFSTUDIO-BLOCK-053
- SwRS-MDOKFSTUDIO-BLOCK-058
- SwRS-MDOKFSTUDIO-BLOCK-069
- SwRS-MDOKFSTUDIO-BLOCK-094
- SwRS-MDOKFSTUDIO-BLOCK-109
- SwRS-MDOKFSTUDIO-BLOCK-117
- SwRS-MDOKFSTUDIO-BLOCK-124
- SwRS-MDOKFSTUDIO-BLOCK-127
- SwRS-MDOKFSTUDIO-BLOCK-129
- SwRS-MDOKFSTUDIO-BLOCK-130
- SwRS-MDOKFSTUDIO-BLOCK-156
- SwRS-MDOKFSTUDIO-BLOCK-166
- SwRS-MDOKFSTUDIO-BLOCK-169
- SwRS-MDOKFSTUDIO-BLOCK-174
- SwRS-MDOKFSTUDIO-BLOCK-191
- SwRS-MDOKFSTUDIO-BLOCK-205
- SwRS-MDOKFSTUDIO-BLOCK-216
- SwRS-MDOKFSTUDIO-BLOCK-227
- SwRS-MDOKFSTUDIO-BLOCK-232
- SwRS-MDOKFSTUDIO-BLOCK-233
- SwRS-MDOKFSTUDIO-BLOCK-234
- SwRS-MDOKFSTUDIO-BLOCK-235
- SwRS-MDOKFSTUDIO-BLOCK-236
- SwRS-MDOKFSTUDIO-BLOCK-237
- SwRS-MDOKFSTUDIO-BLOCK-238
- SwRS-MDOKFSTUDIO-BLOCK-239
- SwRS-MDOKFSTUDIO-BLOCK-240
- SwRS-MDOKFSTUDIO-BLOCK-241
- SwRS-MDOKFSTUDIO-BLOCK-242
- SwRS-MDOKFSTUDIO-BLOCK-243
- SwRS-MDOKFSTUDIO-BLOCK-244
- SwRS-MDOKFSTUDIO-BLOCK-245
- SwRS-MDOKFSTUDIO-BLOCK-252
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-059
- SwRS-MDOKFSTUDIO-TRUST-064
- SwRS-MDOKFSTUDIO-TRUST-065
default_owner_email: gaetan@xeberon.net
---

## Preview edits land exactly, in one undo step, keep line endings, or are refused with a reason

### Normative behavior

When a writer's edit, move, cut or paste reaches the file, the Studio SHALL change exactly the lines the writer meant as one undo step with the line endings of the document and of the block kept, or refuse it with a reason the writer can read and leave the file and the clipboard as they were.

### Preserved stakeholder intent

Writers expect the preview not to corrupt the file when the page and the file disagree.

Writers expect a refusal to be explained and harmless: a stale preview, a read-only preview, an included block, the frontmatter or another open edit.

Writers expect preview edits to join the undo history of the file in a few clear steps.

Writers expect the preview to leave line endings alone, so version control shows only the lines they changed.

As a writer, I trust that every change I make from the preview lands on the lines I meant, reverts with one undo and keeps the line endings of my document, or is refused with a reason, never landing on the wrong text; I am told why when an edit, move or paste cannot be done, and my document and clipboard are left untouched.

### Rationale and constraints

- A change that no longer fits the current text of the file is refused.
- A change is never half-applied.
- The text a writer typed stays in the editor when a save is refused.
- Autosaves of one session merge into one undo step in a text editor that shows the file; moves, cuts and pastes use explicit undo stops.
- Known issue (deduced from the code, not run): a multi-line block of a CRLF document may have its second save refused (see SwRS-MDOKFSTUDIO-BLOCK-234).

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-BLOCK-003](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-003.md): Edit-mode text box follows VS Code undo, redo, select-all and delete-line key bindings
  - [SwRS-MDOKFSTUDIO-BLOCK-041](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-041.md): One edit at a time: an open editor blocks other edits, opens and refreshes
  - [SwRS-MDOKFSTUDIO-BLOCK-042](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-042.md): Typing is autosaved as the smallest single replacement
  - [SwRS-MDOKFSTUDIO-BLOCK-053](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-053.md): Cancel and Escape restore the saved text
  - [SwRS-MDOKFSTUDIO-BLOCK-058](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-058.md): Every host source edit is one undo step, renders once and reports a failed apply
  - [SwRS-MDOKFSTUDIO-BLOCK-069](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-069.md): Marker keys wrap a selection; Home, End, select-all and undo stay in the text box
  - [SwRS-MDOKFSTUDIO-BLOCK-094](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-094.md): The host inserts a new block with clean blank lines
  - [SwRS-MDOKFSTUDIO-BLOCK-109](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-109.md): The up and down arrows of an insert point move its block
  - [SwRS-MDOKFSTUDIO-BLOCK-117](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-117.md): The host swaps two blocks in one edit and keeps their separators
  - [SwRS-MDOKFSTUDIO-BLOCK-124](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-124.md): Moves and clipboard edits are refused for ranges that do not match the document
  - [SwRS-MDOKFSTUDIO-BLOCK-127](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-127.md): An included block is never moved, cut, copied, selected or pasted after
  - [SwRS-MDOKFSTUDIO-BLOCK-129](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-129.md): The page applies a move result only for its own render
  - [SwRS-MDOKFSTUDIO-BLOCK-130](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-130.md): Alt+Up and Alt+Down move the focused block, also from the text box
  - [SwRS-MDOKFSTUDIO-BLOCK-156](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-156.md): A block selection moves as a whole
  - [SwRS-MDOKFSTUDIO-BLOCK-166](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-166.md): Cmd/Ctrl+C copies the exact Markdown of the selected blocks
  - [SwRS-MDOKFSTUDIO-BLOCK-169](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-169.md): Cut removes the selected blocks with one blank separator
  - [SwRS-MDOKFSTUDIO-BLOCK-174](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-174.md): Paste inserts the clipboard as new blocks after the selection or insert point
  - [SwRS-MDOKFSTUDIO-BLOCK-191](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-191.md): The host holds an open block edit and ends it when the block changes
  - [SwRS-MDOKFSTUDIO-BLOCK-205](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-205.md): Open editors are saved before the page hides or leaves the document
  - [SwRS-MDOKFSTUDIO-BLOCK-216](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-216.md): A refused open or save keeps the typed text and says why
  - [SwRS-MDOKFSTUDIO-BLOCK-227](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-227.md): A thread reply or delete is refused while a block edit is open
  - [SwRS-MDOKFSTUDIO-BLOCK-232](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-232.md): Text edits apply in offset order
  - [SwRS-MDOKFSTUDIO-BLOCK-233](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-233.md): Overlapping or out-of-range text edits are refused
  - [SwRS-MDOKFSTUDIO-BLOCK-234](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-234.md): Preview edits keep the line endings of the document
  - [SwRS-MDOKFSTUDIO-BLOCK-235](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-235.md): A refusal is told apart from a plan
  - [SwRS-MDOKFSTUDIO-BLOCK-236](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-236.md): previewEditModeChanged carries a boolean edit mode
  - [SwRS-MDOKFSTUDIO-BLOCK-237](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-237.md): previewEditOpen needs an edit id and a line range
  - [SwRS-MDOKFSTUDIO-BLOCK-238](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-238.md): previewEditSave needs both texts and valid optional fields
  - [SwRS-MDOKFSTUDIO-BLOCK-239](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-239.md): previewEditCancel needs an edit id and a line range
  - [SwRS-MDOKFSTUDIO-BLOCK-240](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-240.md): previewBlockMove needs both ranges and a direction
  - [SwRS-MDOKFSTUDIO-BLOCK-241](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-241.md): previewBlocksCopy needs a line range
  - [SwRS-MDOKFSTUDIO-BLOCK-242](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-242.md): previewBlocksCut needs a line range and an optional pin
  - [SwRS-MDOKFSTUDIO-BLOCK-243](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-243.md): previewBlocksPaste needs a line to paste after
  - [SwRS-MDOKFSTUDIO-BLOCK-244](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-244.md): previewEditClosed carries the id of the closed editor
  - [SwRS-MDOKFSTUDIO-BLOCK-245](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-245.md): previewEditFlushed carries the flush id and a flag
  - [SwRS-MDOKFSTUDIO-BLOCK-252](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-252.md): Overlapping or out-of-range planned edits leave the document unchanged
  - [SwRS-MDOKFSTUDIO-TRUST-005](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-005.md): The host refuses every write request of a read-only preview with a reason
  - [SwRS-MDOKFSTUDIO-TRUST-059](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-059.md): The page accepts only registered host messages addressed to its render
  - [SwRS-MDOKFSTUDIO-TRUST-064](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-064.md): Flush and editor watch messages are addressed by their own id
  - [SwRS-MDOKFSTUDIO-TRUST-065](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
<!-- okf:links:end -->
