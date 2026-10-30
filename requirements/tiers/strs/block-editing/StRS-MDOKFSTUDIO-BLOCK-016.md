---
type: StRS
id: StRS-MDOKFSTUDIO-BLOCK-016
uuid: c155d042-3898-449a-844a-1838e4290a95
title: A writer selects blocks and copies, cuts and pastes them as Markdown
description: When a writer Shift+clicks a block or presses Shift+Up or
  Shift+Down in edit mode, the Studio SHALL select the run of blocks between the
  anchor and that block and outline it, and when the writer presses Ctrl or Cmd
  with C, X or V on that selection, copy the exact Markdown, cut it with one
  blank separator, or paste the clipboard text as new blocks.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: "As a writer, I select a run of blocks with Shift+click or Shift+Arrow
  to treat them as one, and I copy, cut and paste whole blocks as their exact Markdown
  while the document stays tidy: no double blank lines, no glued blocks."
derived_by:
- SwRS-MDOKFSTUDIO-BLOCK-001
- SwRS-MDOKFSTUDIO-BLOCK-004
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-BLOCK-058
- SwRS-MDOKFSTUDIO-BLOCK-124
- SwRS-MDOKFSTUDIO-BLOCK-127
- SwRS-MDOKFSTUDIO-BLOCK-140
- SwRS-MDOKFSTUDIO-BLOCK-148
- SwRS-MDOKFSTUDIO-BLOCK-166
- SwRS-MDOKFSTUDIO-BLOCK-169
- SwRS-MDOKFSTUDIO-BLOCK-174
- SwRS-MDOKFSTUDIO-BLOCK-241
- SwRS-MDOKFSTUDIO-BLOCK-242
- SwRS-MDOKFSTUDIO-BLOCK-243
- SwRS-MDOKFSTUDIO-BLOCK-254
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-065
default_owner_email: gaetan@xeberon.net
---

## A writer selects blocks and copies, cuts and pastes them as Markdown

### Normative behavior

When a writer Shift+clicks a block or presses Shift+Up or Shift+Down in edit mode, the Studio SHALL select the run of blocks between the anchor and that block and outline it, and when the writer presses Ctrl or Cmd with C, X or V on that selection, copy the exact Markdown, cut it with one blank separator, or paste the clipboard text as new blocks.

### Preserved stakeholder intent

Writers expect to select whole blocks, not characters, when they reorganise a document.

Writers expect cut and paste of blocks to keep the document well-formed.

As a writer, I select a run of blocks with Shift+click or Shift+Arrow to treat them as one, and I copy, cut and paste whole blocks as their exact Markdown while the document stays tidy: no double blank lines, no glued blocks.

### Rationale and constraints

- The selection is announced to screen readers and cleared by Escape, a plain click, a refresh of the preview or leaving edit mode.
- An included block stops the range, and the properties table is never selected.
- Copy never changes the document; cut and paste are one undo step each.
- The clipboard keys stay native in a text box, a field, the properties table and in reading mode.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-BLOCK-001](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-001.md): The Edit button turns edit mode on and off and tidies up on exit
  - [SwRS-MDOKFSTUDIO-BLOCK-004](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-004.md): Arrow keys, Enter and Escape drive block editing without the mouse
  - [SwRS-MDOKFSTUDIO-BLOCK-041](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-041.md): One edit at a time: an open editor blocks other edits, opens and refreshes
  - [SwRS-MDOKFSTUDIO-BLOCK-058](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-058.md): Every host source edit is one undo step, renders once and reports a failed apply
  - [SwRS-MDOKFSTUDIO-BLOCK-124](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-124.md): Moves and clipboard edits are refused for ranges that do not match the document
  - [SwRS-MDOKFSTUDIO-BLOCK-127](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-127.md): An included block is never moved, cut, copied, selected or pasted after
  - [SwRS-MDOKFSTUDIO-BLOCK-140](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-140.md): Shift+click and Shift+Arrow select a run of blocks
  - [SwRS-MDOKFSTUDIO-BLOCK-148](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-148.md): A block selection survives saves and is cleared by patches
  - [SwRS-MDOKFSTUDIO-BLOCK-166](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-166.md): Cmd/Ctrl+C copies the exact Markdown of the selected blocks
  - [SwRS-MDOKFSTUDIO-BLOCK-169](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-169.md): Cut removes the selected blocks with one blank separator
  - [SwRS-MDOKFSTUDIO-BLOCK-174](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-174.md): Paste inserts the clipboard as new blocks after the selection or insert point
  - [SwRS-MDOKFSTUDIO-BLOCK-241](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-241.md): previewBlocksCopy needs a line range
  - [SwRS-MDOKFSTUDIO-BLOCK-242](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-242.md): previewBlocksCut needs a line range and an optional pin
  - [SwRS-MDOKFSTUDIO-BLOCK-243](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-243.md): previewBlocksPaste needs a line to paste after
  - [SwRS-MDOKFSTUDIO-BLOCK-254](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-254.md): Right and Left move the block selection down and up the structure
  - [SwRS-MDOKFSTUDIO-TRUST-005](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-005.md): The host refuses every write request of a read-only preview with a reason
  - [SwRS-MDOKFSTUDIO-TRUST-065](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
<!-- okf:links:end -->
