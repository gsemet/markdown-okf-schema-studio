---
type: StRS
id: StRS-MDOKFSTUDIO-BLOCK-003
uuid: e58ac6b9-1ba7-416d-a350-258225946a5d
title: A writer edits the raw Markdown of a block in a framed editor
description: When a writer clicks a rendered block in edit mode, the Studio
  SHALL open a framed editor on that block's raw Markdown, in place of the
  block, with the caret at the clicked word, the line range of the text, its
  keys and Done and Cancel buttons, and for a block that comes from an included
  file open the include directive of the edited document instead.
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
user_need: As a writer, I click a paragraph, heading, list, admonition, code
  block or image in the preview and edit its Markdown right there, see exactly
  which lines of the file I am editing, how to finish and how to abandon, and
  never change an included file by accident.
derived_by:
- SwRS-MDOKFSTUDIO-BLOCK-001
- SwRS-MDOKFSTUDIO-BLOCK-002
- SwRS-MDOKFSTUDIO-BLOCK-014
- SwRS-MDOKFSTUDIO-BLOCK-017
- SwRS-MDOKFSTUDIO-BLOCK-021
- SwRS-MDOKFSTUDIO-BLOCK-023
- SwRS-MDOKFSTUDIO-BLOCK-026
- SwRS-MDOKFSTUDIO-BLOCK-029
- SwRS-MDOKFSTUDIO-BLOCK-033
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-BLOCK-102
- SwRS-MDOKFSTUDIO-BLOCK-127
- SwRS-MDOKFSTUDIO-BLOCK-255
default_owner_email: gaetan@xeberon.net
---

## A writer edits the raw Markdown of a block in a framed editor

### Normative behavior

When a writer clicks a rendered block in edit mode, the Studio SHALL open a framed editor on that block's raw Markdown, in place of the block, with the caret at the clicked word, the line range of the text, its keys and Done and Cancel buttons, and for a block that comes from an included file open the include directive of the edited document instead.

### Preserved stakeholder intent

Writers expect to fix a sentence by clicking it, without switching to the text editor and finding the line.

Writers expect included text to be shown but not changed from the including document.

Writers expect an inline editor to look like an editor: the raw text, a clear frame and the way out.

As a writer, I click a paragraph, heading, list, admonition, code block or image in the preview and edit its Markdown right there, see exactly which lines of the file I am editing, how to finish and how to abandon, and never change an included file by accident.

### Rationale and constraints

- A click on a list item edits the list that holds it; a click on a comment chip, an open thread or a properties table cell keeps its own action.
- An outline shows which element a click would edit, and Enter or Space on a focused block does the same as a click.
- In reading mode the same click reveals the source line instead of editing.
- Included blocks are never selected, moved, copied, cut or pasted next to; the refusals are listed under the use case about refused edits.
- The rendered block stays hidden while its editor is open and comes back when the editor closes.
- The text box has no spell check or auto-correction, grows with its text and uses a monospace font.
- The editor of the first block of a document stays clear of the floating toolbar; the spacing values and the clearance rules are specified under layout and width, and this use case covers which editors count as the first-block editor.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-BLOCK-001](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-001.md): The Edit button turns edit mode on and off and tidies up on exit
  - [SwRS-MDOKFSTUDIO-BLOCK-002](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-002.md): A horizontal rule has a tall invisible hit area
  - [SwRS-MDOKFSTUDIO-BLOCK-014](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-014.md): A click or Enter on a mapped block opens its editor
  - [SwRS-MDOKFSTUDIO-BLOCK-017](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-017.md): The hover outline shows what a click would edit
  - [SwRS-MDOKFSTUDIO-BLOCK-021](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-021.md): Clicking any part of an admonition edits its whole directive
  - [SwRS-MDOKFSTUDIO-BLOCK-023](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-023.md): A click on an image block opens its editor
  - [SwRS-MDOKFSTUDIO-BLOCK-026](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-026.md): The editor opens with the caret at the clicked word
  - [SwRS-MDOKFSTUDIO-BLOCK-029](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-029.md): The block editor is a labelled one-pixel frame that hides its rendered block
  - [SwRS-MDOKFSTUDIO-BLOCK-033](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-033.md): The status line shows the lines and keys, with Done and Cancel beside it
  - [SwRS-MDOKFSTUDIO-BLOCK-041](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-041.md): One edit at a time: an open editor blocks other edits, opens and refreshes
  - [SwRS-MDOKFSTUDIO-BLOCK-102](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-102.md): An empty body offers one Start writing button
  - [SwRS-MDOKFSTUDIO-BLOCK-127](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-127.md): An included block is never moved, cut, copied, selected or pasted after
  - [SwRS-MDOKFSTUDIO-BLOCK-255](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-255.md): A block editor that opens late leaves the focus in a field that took it
<!-- okf:links:end -->
