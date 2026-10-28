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
lifecycle: proposed
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
