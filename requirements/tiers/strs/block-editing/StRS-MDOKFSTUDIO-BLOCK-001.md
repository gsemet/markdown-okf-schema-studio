---
type: StRS
id: StRS-MDOKFSTUDIO-BLOCK-001
uuid: 7224caa2-5c79-4b5c-ac7d-077856f7b9d9
title: A writer switches edit mode and finds it as left
description: When a writer clicks the Edit button of a preview, or opens a
  preview in a workspace where edit mode was last on, the Studio SHALL switch
  edit mode on or off, saving or closing what is open, and start that preview in
  edit mode when it was last in edit mode.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I turn edit mode on to change my document in the preview
  and off to read it again, without losing anything I typed, and I reopen a
  document to find the preview in the edit mode I last chose, never offered
  editing in a preview that cannot change the file.
derived_by:
- SwRS-MDOKFSTUDIO-BLOCK-001
- SwRS-MDOKFSTUDIO-BLOCK-012
- SwRS-MDOKFSTUDIO-BLOCK-236
- SwRS-MDOKFSTUDIO-BLOCK-257
- SwRS-MDOKFSTUDIO-BLOCK-258
- SwRS-MDOKFSTUDIO-LIFE-169
- SwRS-MDOKFSTUDIO-LIFE-170
- SwRS-MDOKFSTUDIO-TRUST-001
default_owner_email: gaetan@xeberon.net
---

## A writer switches edit mode and finds it as left

### Normative behavior

When a writer clicks the Edit button of a preview, or opens a preview in a workspace where edit mode was last on, the Studio SHALL switch edit mode on or off, saving or closing what is open, and start that preview in edit mode when it was last in edit mode.

### Preserved stakeholder intent

Writers expect to change a document where they read it and to go back to plain reading with one click.

Writers expect the preview to remember whether they were editing, and not to lose a write silently on a file that VS Code holds read-only.

As a writer, I turn edit mode on to change my document in the preview and off to read it again, without losing anything I typed, and I reopen a document to find the preview in the edit mode I last chose, told when a file that VS Code holds read-only cannot be changed.

### Rationale and constraints

- Turning edit mode off saves the text of an open block editor and clears the block selection, the hover outline and the insert points.
- Turning edit mode on does not reflow the reading layout: paragraphs keep their wrapping and the text does not move.
- The choice is remembered per workspace; a preview that was already open and reloaded keeps its own state first.
- Every preview has the Edit button, in Restricted Mode and for a file outside every workspace folder too; trust never takes it away. A file that VS Code holds read-only keeps its button, and a write to it is refused with the reason "This file is read-only in VS Code.".

### Main paths

#### Path 1: Turn edit mode on and off

1. The preview shows the document in reading mode
   - SwRS-MDOKFSTUDIO-BLOCK-001: the writer clicks Edit and the page turns edit mode on, shows it on the button and posts it to the host, with the reading layout unchanged
   - Option SwRS-MDOKFSTUDIO-BLOCK-236 (refusal): the host accepts an edit mode change only when the value is a boolean
2. Edit mode is on
   - SwRS-MDOKFSTUDIO-BLOCK-001: the writer clicks Edit again, the open block editor is saved and the selection and hover outline are cleared
   - Option SwRS-MDOKFSTUDIO-BLOCK-001 (boundary): with nothing open there is nothing to tidy up
   - Option SwRS-MDOKFSTUDIO-LIFE-169 (nominal): the host remembers the edit mode for the workspace
3. The preview is back in reading mode with the edit state removed

#### Path 2: Reopen a document

1. A document is opened in a new preview
   - SwRS-MDOKFSTUDIO-LIFE-170: each view choice starts from the saved panel state, else the stored workspace value, else its default
   - Option SwRS-MDOKFSTUDIO-LIFE-170 (refusal): an invalid value is ignored and the next source is used
2. The preview opens with the view choices last made

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-BLOCK-001](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-001.md): The Edit button turns edit mode on and off and tidies up on exit
  - [SwRS-MDOKFSTUDIO-BLOCK-012](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-012.md): A read-only preview has no Edit button
  - [SwRS-MDOKFSTUDIO-BLOCK-236](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-236.md): previewEditModeChanged carries a boolean edit mode
  - [SwRS-MDOKFSTUDIO-BLOCK-257](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-257.md): A block editor in a grid card widens the card and keeps the palette above a readable text box
  - [SwRS-MDOKFSTUDIO-BLOCK-258](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-258.md): A click on a card title or option opens the editor on its own line, the title is inline text and Enter saves a one-line editor
  - [SwRS-MDOKFSTUDIO-LIFE-169](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-169.md): A view choice made on the page is stored for the workspace
  - [SwRS-MDOKFSTUDIO-LIFE-170](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-170.md): A new page starts each view choice from the panel, stored or default value
  - [SwRS-MDOKFSTUDIO-TRUST-001](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-001.md): A document is editable whatever the trust; only its reads are restricted
<!-- okf:links:end -->
