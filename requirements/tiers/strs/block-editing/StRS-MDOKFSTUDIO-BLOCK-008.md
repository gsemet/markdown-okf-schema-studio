---
type: StRS
id: StRS-MDOKFSTUDIO-BLOCK-008
uuid: 70a50477-2959-45c5-86f6-e2fcc373c201
title: A writer types and moves between blocks with text editor keys
description: While a block editor has the focus, the Studio SHALL give the keys
  the behaviour of a text editor, with lists that continue, Tab that indents,
  selections that wrap, Home and End that jump and undo that stays in the
  editor, and, when an arrow key is pressed at the edge of the text, save the
  block and open the editor of the neighbour block.
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: "As a writer, I type Markdown in the block editor and the keys do what
  I expect: lists continue, Tab indents, selected text gets wrapped, Home and End
  jump, undo stays in the editor, and I keep writing in the next or previous block
  by pressing an arrow key at the edge of the text, without the mouse."
derived_by:
- SwRS-MDOKFSTUDIO-BLOCK-061
- SwRS-MDOKFSTUDIO-BLOCK-069
- SwRS-MDOKFSTUDIO-BLOCK-077
- SwRS-MDOKFSTUDIO-BLOCK-079
---

## A writer types and moves between blocks with text editor keys

### Normative behavior

While a block editor has the focus, the Studio SHALL give the keys the behaviour of a text editor, with lists that continue, Tab that indents, selections that wrap, Home and End that jump and undo that stays in the editor, and, when an arrow key is pressed at the edge of the text, save the block and open the editor of the neighbour block.

### Preserved stakeholder intent

Writers expect the inline editor to be as comfortable as the text editor for the Markdown they write every day.

Writers expect to walk through a document block by block with the keyboard.

As a writer, I type Markdown in the block editor and the keys do what I expect: lists continue, Tab indents, selected text gets wrapped, Home and End jump, undo stays in the editor, and I keep writing in the next or previous block by pressing an arrow key at the edge of the text, without the mouse.

### Rationale and constraints

- Keys the editor handles do not also trigger a VS Code shortcut; keys it does not use, such as Ctrl+Tab, still reach VS Code.
- Ctrl or Cmd+A in a text box selects the text of that box only.
- Up and Down leave only from the first or last wrapped line; Left and Right leave at the very start or end.
- The properties table is skipped: its fields have their own editor.
