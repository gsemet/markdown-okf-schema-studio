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
req_lifecycle: proposed
status: stable
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

### Scenario (boundary): The TODO action has no shortcut
| Input | Outcome |
| --- | --- |
| Ctrl+/ or Cmd+/ in the text box of a block editor | The TODO action does not run: the shortcut toggles a plain comment, see SwRS-MDOKFSTUDIO-PALETTE-266 |
| The tooltip of the TODO button | Toggle TODO comment, with no shortcut in parentheses |

### Scenario (nominal): The slash menu finds the action by three names
| Typed after the slash in a block editor | Outcome |
| --- | --- |
| /todo | The slash menu lists the TODO action, titled Toggle TODO comment |
| /fixme or /task | The slash menu lists the same TODO action |

### Related requirements
- SwRS-MDOKFSTUDIO-PALETTE-001: the TODO button of the palette is listed with the palette buttons; the slash menu mechanics belong to the palette-slash scope.
- SwRS-MDOKFSTUDIO-PALETTE-266: the Ctrl+/ shortcut, which toggles a plain comment.

### Verification notes
- Method: test/page/modules/editActions.test.ts (the table cases generated as `editActions todo ` plus the input: caret in a line, selection, wrapped inputs, the mixed input, the input "[a\n]b", the inputs "|", "  |" and an empty TODO comment with the caret; `the todo toggle is its own inverse`; `a line containing --> is never wrapped in a TODO comment`; `the registry lists the actions with metadata and indexes them by id` (the TODO action has no shortcut, and the slash menu entry)).
- Method: test/page/modules/editActions.test.ts (marker file of the tile).
- Method: test/page/runtimeEditPalette.test.ts (T21: the TODO button tooltip has no shortcut).
- Criteria: The produced text equals the expected wrapped text for each case, the caret offset equals the end of the opening marker on a blank line, a line with --> is returned unchanged, the TODO action has no shortcut, its tooltip has none, and the registry entry todo has the title and the three aliases and the block scope. The aliases are not asserted by name.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-012](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-012.md): A writer sees HTML comments and TODO notes as chips and toggles them
<!-- okf:links:end -->
