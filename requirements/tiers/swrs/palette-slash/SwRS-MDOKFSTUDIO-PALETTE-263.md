---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-263
uuid: 333c306e-5aad-4d88-9fcd-1aff9b2ec9b7
title: Slash commands have short alternative names
description: When the writer types an alternative name after the slash, the
  extension SHALL list the command that carries that alias among the commands of
  the current palette mode, as it lists it for its label.
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-015
- StRS-MDOKFSTUDIO-PALETTE-007
- StRS-MDOKFSTUDIO-PALETTE-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/palette/paletteActions.ts
tested_in_files:
- test/page/modules/editPalette.test.ts
- test/page/modules/slashMenu.test.ts
---

## Slash commands have short alternative names

### Normative behavior

When the writer types an alternative name after the slash, the extension SHALL list the command that carries that alias among the commands of the current palette mode, as it lists it for its label.

### Scenario (nominal): An alias finds its command
| Mode | Typed | Outcome |
| --- | --- | --- |
| strict | /hyperlink | Link is the first entry |
| strict | /ul and /ol | Bulleted list and Numbered list are found |
| strict | /list | both list entries are found |
| strict | /hr | Horizontal rule is the first entry |
| MyST | /table | the exact label Table is the first entry, followed by the other table commands |
| GFM | /center | Column alignment is found |
| GFM | /spoiler | Collapsible is the first entry |
| MyST | /xref | Reference is the first entry |

### Scenario (boundary): The aliases of every command
| Group | Command | Aliases |
| --- | --- | --- |
| strict inline | Bold | strong, b |
| strict inline | Italic | emphasis, em, i |
| strict inline | Strikethrough | strike, del, delete |
| strict inline | Colour | color, highlight, background |
| strict inline | Link | url, hyperlink |
| strict inline | Image | img, picture, photo |
| strict inline | Emoji | smiley, emoticon, face |
| strict inline | Thread | thread, discussion, comment |
| strict block | Code block | code, fence, snippet, pre |
| strict block | Bulleted list | bullet, bullets, ul, unordered, list, - and * |
| strict block | Numbered list | numbered, ol, ordered, list, 1. |
| strict block | Blockquote | quote, citation, bq |
| strict block | Horizontal rule | hr, divider, line, separator |
| table | Table | grid, tbl |
| table | HTML table | table, html |
| table | Column alignment | align, left, center, right |
| table | Table with caption | table, caption, list-table |
| table | List table | list-table, table, convert |
| table | Pipe table | pipe, table, convert |
| GitHub (GFM and MyST modes) | Alert | callout, github |
| GitHub (GFM and MyST modes) | Checkbox | todo, task, checklist, tasklist |
| GitHub (GFM and MyST modes) | Collapsible | collapse, toggle, spoiler, accordion |
| GitHub (GFM and MyST modes) | Footnote | fn, endnote |
| GitHub (GFM and MyST modes) | Key | kbd, key, keyboard, shortcut |
| MyST mode | Admonition | callout |
| MyST mode | Definition list | definition, dl, glossary |
| MyST mode | Math | equation, latex, formula, katex |
| MyST mode | Subscript | subscript |
| MyST mode | Superscript | superscript, power, exponent |
| MyST mode | Label | anchor, target |
| MyST mode | Reference | reference, xref, crossref |
| MyST mode | Document link | document, file, page |
| MyST mode | Citation | cite, citation, bibtex, bibliography |
| MyST mode | Dropdown | details, collapse |
| MyST mode | Figure | fig, image, picture |
| MyST mode | Key (MyST) | key, kbd, keyboard |

### Scenario (boundary): An alias shared by two commands
| Mode | Typed | Outcome |
| --- | --- | --- |
| MyST | /details | Dropdown is listed before the GitHub Collapsible, because the MyST group wins a near tie |
| GFM | /todo | the TODO comment is the first entry, because its label is the exact match |

### Scenario (refusal): A command outside its mode or place is not listed
| Mode and place | Typed | Outcome |
| --- | --- | --- |
| strict, caret outside a colour code | /color | Colour code is not listed |
| strict | the menu is opened | Collapsible and the other GitHub commands are not listed |
| caret outside a table of the form they convert | the menu is opened | List table and Pipe table are not listed; each appears only with the caret in a table of the form it converts |
| table cell | the menu is opened | only Bold, Italic, Strikethrough, Colour, Link and Emoji are listed |

### Scenario (nominal): A command found by an alias runs as its button
- GIVEN the menu lists a command found by one of its aliases
- WHEN the writer chooses it
- THEN it runs the same edit as its palette button, and Reference, Citation, Document link, Figure and Image open the same picker or dialog as their buttons

### Verification notes

- Method: test/page/modules/slashMenu.test.ts (scenarios "An alias finds its command" for hyperlink, ul, ol, list, hr, xref, spoiler, table and the first-entry aliases of bold, link, image, code, quote, math, figure, ref, admonition, cite, todo and task; "A command found by an alias runs as its button"); the alias strings other than these are asserted by no test, so the table of the boundary scenario is untested beyond them
- Method: test/page/modules/editPalette.test.ts (scenario "A command outside its mode or place is not listed", the conversion rows: the slash menu offers the conversion only inside a table of the other form)
- Criteria: The aliases are those of the registry entries in src/core/palette/paletteActions.ts. The actions themselves are specified in SwRS-MDOKFSTUDIO-TABLE-106, SwRS-MDOKFSTUDIO-TABLE-111, SwRS-MDOKFSTUDIO-TABLE-115, SwRS-MDOKFSTUDIO-TABLE-117, SwRS-MDOKFSTUDIO-TABLE-073 and SwRS-MDOKFSTUDIO-TABLE-074, the Mermaid entry in SwRS-MDOKFSTUDIO-DIAG-017 and the TODO entry by the review annotation requirements.
