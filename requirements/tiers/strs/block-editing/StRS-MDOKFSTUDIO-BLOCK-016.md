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
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: "As a writer, I select a run of blocks with Shift+click or Shift+Arrow
  to treat them as one, and I copy, cut and paste whole blocks as their exact Markdown
  while the document stays tidy: no double blank lines, no glued blocks."
derived_by:
- SwRS-MDOKFSTUDIO-BLOCK-001
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
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-065
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
