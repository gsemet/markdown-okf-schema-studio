---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-160
uuid: c66dc212-45fd-41d4-8a84-352b7f855cea
title: The TODO action wraps or unwraps the touched lines in TODO comments
description: When a writer runs the TODO action in a block editor on lines that
  are not wrapped, the page SHALL wrap each non-blank line touched by the caret
  or the selection in a TODO comment, after its indentation, and unwrap them
  when every non-blank touched line is already wrapped.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-012
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/editActions.ts
- src/page/modules/inlineEditActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
default_owner_email: gaetan@xeberon.net
---

## The TODO action wraps or unwraps the touched lines in TODO comments

### Normative behavior

When a writer runs the TODO action in a block editor on lines that are not wrapped, the page SHALL wrap each non-blank line touched by the caret or the selection in a TODO comment, after its indentation, and unwrap them when every non-blank touched line is already wrapped.

### Scenario (nominal): Caret in a line
- GIVEN the text "abc" with the caret inside
- WHEN the TODO action runs
- THEN the line reads "`<!-- TODO: abc -->`" and the caret stays on the same letter

### Scenario (nominal): Selection of two lines
- GIVEN the lines "a" and "b" selected, partly or fully
- WHEN the TODO action runs
- THEN both lines are wrapped, each after its own indentation, and the whole block stays selected

### Scenario (nominal): Unwrap when every touched line is wrapped
- GIVEN the lines "`<!-- TODO: a -->`" and "`<!-- TODO: b -->`" selected
- WHEN the TODO action runs
- THEN the lines read a and b; and the lines "- one" and "- two" wrapped by the action come back as the original lines when the action runs again (wrap then unwrap restores the text)

### Scenario (boundary): Mixed selection and selection ending at a line start
| Input | Outcome |
| --- | --- |
| The lines "a" and "`<!-- TODO: b -->`" selected | Both lines are wrapped once |
| A selection that ends at the start of a line | That last line is left alone |

### Scenario (boundary): Blank line
| Input | Outcome |
| --- | --- |
| An empty line with the caret | The line reads "`<!-- TODO:  -->`" with the caret between the spaces |
| A line of two spaces with the caret | The comment keeps the two spaces of indentation |
| An empty TODO comment with the caret inside it | The comment is removed, the line is empty with the caret |

### Scenario (refusal): A line holding a comment end is never wrapped
| Input | Outcome |
| --- | --- |
| The line "a --> b" with the caret | No edit is made |
| The lines "a" and "b --> c" selected | Only the first line is wrapped |

### Scenario (nominal): Ctrl+/ or Cmd+/ runs the action
| Keys in the text box of a block editor | Outcome |
| --- | --- |
| Ctrl+/ or Cmd+/, on macOS or elsewhere, with or without Shift | The TODO action runs |
| Ctrl+Alt+/ (Alt held) | The shortcut is not matched |

In a table cell the shortcut does nothing, see SwRS-MDOKFSTUDIO-TABLE-085.

### Scenario (nominal): The slash menu finds the action by three names
| Typed after the slash in a block editor | Outcome |
| --- | --- |
| /todo | The slash menu lists the TODO action, titled Toggle TODO comment |
| /fixme or /task | The slash menu lists the same TODO action |

### Related requirements
- SwRS-MDOKFSTUDIO-PALETTE-001: the TODO button of the palette is listed with the palette buttons; the slash menu mechanics belong to the palette-slash scope.
- SwRS-MDOKFSTUDIO-TABLE-085: the shortcut does nothing in a table cell.

### Verification notes
- Method: test/page/modules/editActions.test.ts (the table cases generated as `editActions todo ` plus the input: caret in a line, selection, wrapped inputs, the mixed input, the input "[a\n]b", the inputs "|", "  |" and an empty TODO comment with the caret; `the todo toggle is its own inverse`; `a line containing --> is never wrapped in a TODO comment`; `shortcutFor accepts Ctrl+/ and Cmd+/ on every platform`, `shortcutFor ignores plain keys, other modifiers, composition and AltGr`; `the registry lists the actions with metadata and indexes them by id` for the slash menu entry).
- Method: test/page/modules/editActions.test.ts (marker file of the tile).
- Method: real window palette-slash/r03-shortcuts-bold-todo in test/integration/realInput/textEditing.ts (shortcut).
- Criteria: The produced text equals the expected wrapped text for each case, the caret offset equals the end of the opening marker on a blank line, a line with --> is returned unchanged, shortcutFor returns the todo action for either modifier with or without Shift and nothing with Alt, and the registry entry todo has the title and the three aliases and the block scope. The aliases are not asserted by name.
