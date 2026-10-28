---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-085
uuid: 4b0dcb78-5bb8-4c26-8ff5-6549729a30eb
title: The table bar's cell group formats the cell text
description: When a cell editor is open, the extension SHALL add to the table
  bar, after a separator, a group named "Cell formatting" holding only the
  palette buttons allowed in a cell and no mode selector, and apply its buttons,
  their shortcuts and the cell slash menu to the cell text.
project: markdown-okf-schema-studio
scope: table-editing
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-012
- StRS-MDOKFSTUDIO-PALETTE-015
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/blockEditor.ts
- src/page/features/tableCellEditor.ts
- src/page/features/textControls.ts
tested_in_files:
- test/integration/realInput/markers.ts
- test/page/modules/slashMenu.test.ts
- test/page/runtimePaletteActions.test.ts
- test/visual/capture_edit_checks.py
default_owner_email: gaetan@xeberon.net
---

## The table bar's cell group formats the cell text

### Normative behavior

When a cell editor is open, the extension SHALL add to the table bar, after a separator, a group named "Cell formatting" holding only the palette buttons allowed in a cell and no mode selector, and apply its buttons, their shortcuts and the cell slash menu to the cell text.

### Scenario (nominal): Cell group
| Input | Outcome |
| --- | --- |
| A cell editor open in GFM mode, the bar inspected | After the separator the group holds bold, italic, strikethrough, link, colour, colour code, emoji and key buttons and no block-only button such as heading, quote, table, image or code fence |
| The same editor in MyST mode, the bar inspected | Sub, sup and the key role are offered |

### Scenario (nominal): A button applies to the cell text
- GIVEN all of the cell text selected and Bold pressed
- WHEN the cell text is read
- THEN it starts with ** and the editor is still open and focused, and Cmd+Z restores the text; the format was applied as one native edit
- AND WHEN the writer then presses Enter, the cell is saved

### Scenario (nominal): Cmd or Ctrl with B, I or K
| Input | Outcome |
| --- | --- |
| Text selected in a cell and Cmd+B (Ctrl on other platforms) | The text is bold, the default is prevented and the key is stopped |
| Text selected in a cell and Cmd+K | The link panel opens in the cell |
| Cmd+I in the cell text box | Italic runs on the cell text and the key stays away from the browser |

### Scenario (refusal): Block-only shortcut
| Input | Outcome |
| --- | --- |
| Text in a cell and the shortcut of the TODO action pressed | The cell text is unchanged |
| Cmd+B in the same cell | The action runs |

### Scenario (nominal): Slash menu of a cell
| Input | Outcome |
| --- | --- |
| The writer types a slash in a cell editor in MyST mode | The menu lists Bold, Italic, Strikethrough, Colour, Link, Emoji, Key, Subscript, Superscript and Key (MyST), and no list entry, Table, Code block, Quote, Rule, Alert, Admonition, Figure or Image; the chosen command runs through the cell formatting group |
| A cell whose caret is inside a colour code | Colour code is listed too |

### Scenario (boundary): Rebuilt bar keeps the group
| Input | Outcome |
| --- | --- |
| The editor moved to another cell by a click, rendered again | The bar element is the same and holds the same group element |
| The editor moved to the next cell by Tab, rendered again | The same bar and the same group are in place |

### Scenario (boundary): The group leaves with the editor
| Input | Outcome |
| --- | --- |
| The editor closed by Escape | No cell group and no table bar are left |
| The editor moved to another cell | The group is still there |

### Related requirements
- SwRS-MDOKFSTUDIO-TABLE-055: the row and column buttons that render the cell editor again, and the closing of the slash menu when the bar is rebuilt.

### Verification notes
- Method: test/page/runtimePaletteActions.test.ts, unit tests T35: the cell bar keeps the table operations and adds the inline group after a separator ("Cell group"), T35: Bold in a cell is one native edit, keeps the cell open and Enter still saves it ("A button applies to the cell text"), T35: the bold shortcut works in a cell and stays out of the browser ("Cmd or Ctrl with B, I or K", Bold row; the italic and link shortcuts share the same function and have no cell-specific test), T35: block-only shortcuts do nothing in a cell ("Block-only shortcut"), T35: table operations keep the inline group in the rebuilt bar (row and column buttons of "Rebuilt bar keeps the group"; the cell-switch case is read from renderTableCellEditor and has no test) and T35: the cell group leaves with the editor ("The group leaves with the editor"; the still-open case has no separate assertion).
- Method: test/page/modules/slashMenu.test.ts, unit test P11: the table cell palette lists only the actions allowed in a cell ("Slash menu of a cell"); the entries are the cell palette's own, so they follow the palette mode.
- Method: test/integration/realInput/blockKeys.ts, real-window scenario scenarioTableCellBold (id table-editing/r08-cell-bold-shortcut; markers in test/integration/realInput/markers.ts) ("A button applies to the cell text", "Cmd or Ctrl with B, I or K").
- Method: test/visual/capture_edit_checks.py, visual check check_cell_bar_formatting ("Cell group", "A button applies to the cell text").
- Criteria: The ids of the buttons in the group and the absence of block-only ones; value, focus and open state of the editor after the press; text after the key and the prevented and stopped flags; unchanged value and no message for a block-only shortcut; the entries of the cell palette; group identity across the render; no cell group element after the close.
