---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-232
uuid: c656a1b0-78e6-4434-9e65-ece8a0c44f98
title: A slash opens the slash menu only where a command is meant
description: When the writer types a slash with no selection at the start of a
  line or after whitespace in the text box of a paragraph editor, an insertion
  editor, a Start writing editor or a table cell editor, outside inline code and
  fenced code and not by a paste or an IME composition, the extension SHALL open
  the slash menu, and close it when a composition starts or when the typed
  command holds a space or a second slash, leaving the text as typed.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-015
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/blockSourceEditor.ts
- src/page/modules/slashMenu.ts
tested_in_files:
- test/integration/realInput/markers.ts
- test/page/modules/slashMenu.test.ts
default_owner_email: gaetan@xeberon.net
---

## A slash opens the slash menu only where a command is meant

### Normative behavior

When the writer types a slash with no selection at the start of a line or after whitespace in the text box of a paragraph editor, an insertion editor, a Start writing editor or a table cell editor, outside inline code and fenced code and not by a paste or an IME composition, the extension SHALL open the slash menu, and close it when a composition starts or when the typed command holds a space or a second slash, leaving the text as typed.

### Scenario (nominal): Line start or after whitespace
- GIVEN a block editor with an empty text box
- WHEN the writer types /
- THEN the slash menu opens

| Editor | Outcome |
| --- | --- |
| paragraph editor, insertion editor, Start writing editor, table cell editor | the menu opens for a slash at the start of a line or after whitespace |

### Scenario (refusal): A slash inside a word, an address or a tag
- GIVEN the text path, http: or <
- WHEN the writer types /
- THEN no menu opens

| Character before the slash | Outcome |
| --- | --- |
| not whitespace (a path, a scheme, a closing tag) | no menu opens |
| start of the line, or whitespace | the menu may open |

### Scenario (refusal): A selection, a paste or an IME composition
- GIVEN a selection of text, a text box that receives a slash by paste, and an IME composition that produces a slash
- WHEN the input event arrives
- THEN no menu opens

| Input | Outcome |
| --- | --- |
| slash typed while text is selected | no menu opens |
| slash that arrives by a paste | no menu opens |
| slash that arrives during an IME composition | no menu opens |
| input type insertText, or no input type | may open the menu; no other input type does |

### Scenario (boundary): Code
- GIVEN the caret in or around a code span, a fenced block or a fence line
- WHEN the writer types /
- THEN the menu opens or not as the table says

| Caret | Outcome |
| --- | --- |
| inside a closed inline code span | no menu opens |
| after a closed code span | the menu opens |
| after an unmatched backtick | the menu opens |
| inside a fenced code block | no menu opens |
| after the opening fence, on its info string | no menu opens |

### Scenario (nominal): A composition that starts while the menu is open closes it
- GIVEN an open menu
- WHEN a composition starts
- THEN the menu closes

| Event on an open menu | Outcome |
| --- | --- |
| composition starts | the menu closes |
| the writer types a letter (no composition) | the menu stays open |

### Scenario (boundary): A second slash or a space ends the command
- GIVEN an open menu
- WHEN the writer types a second /, or a space
- THEN the menu closes and the typed text stays

| Typed after the slash | Outcome |
| --- | --- |
| a second slash | the menu closes and // stays plain text |
| a space (any whitespace character counts as a space) | the menu closes and the slash and the space stay |

### Related requirements
- SwRS-MDOKFSTUDIO-PALETTE-238: the commands the open menu lists.
- SwRS-MDOKFSTUDIO-PALETTE-240: how the typed query ranks the commands.
- SwRS-MDOKFSTUDIO-FMEDIT-001: the frontmatter field editors, for which the menu is not built.

### Verification notes
- Method: test/page/modules/slashMenu.test.ts, unit tests "P11: a slash at a line start or after whitespace may open the menu, other slashes may not" (line start, word or address) and "P11: typing a slash opens the menu; a slash in a word, URL or code does not" (line start, word or address, code), "P11: a slash typed while text is selected does not open the menu" (selection), "P11: no menu inside inline code, a fenced block or a fence info string" (code), "P11: // and / followed by a space close the menu; a paste or composition does not open it" (paste, composition, composition while open, second slash or space).
- Method: visual scenarios palette-slash/v11-slash-strict-light-900, palette-slash/v12-slash-gfm-light-900, palette-slash/v13-slash-myst-light-900, palette-slash/v14-slash-myst-filtered-dark-900 (an open menu after a typed slash); real-window scenario scenarioSlashMenu in test/integration/realInput/textEditing.ts (line start).
- Criteria: Only an insert event of the character / opens the menu; the menu is not built for the frontmatter editors (SwRS-MDOKFSTUDIO-FMEDIT-001). canOpenAt returns false when the character before the slash is not whitespace. A fence is a line that starts with three backticks or three tildes; a blank line ends the paragraph of a code span; a double-backtick span needs a double-backtick closer. Only the input types insertText, or no type, can open the menu. The input event with isComposing true closes the menu. Any whitespace character counts as a space.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-015](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-015.md): A writer runs any palette command from an accessible slash menu
<!-- okf:links:end -->
