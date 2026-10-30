---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-061
uuid: b808ad5e-4272-4186-8b0d-bbd2762449e4
title: Tab, Shift+Tab and Enter indent and continue lists, quotes and fences
description: When a writer presses Tab, Shift+Tab or Enter in the text box of a
  block editor, the page SHALL indent or outdent every line touched by the
  selection, or continue the list marker, quote prefix or indentation of the
  current line, and leave the key to the text box when no rule applies.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-008
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/textEditing.ts
tested_in_files:
- test/integration/realInput/markers.ts
- test/page/modules/textEditing.test.ts
- test/page/runtimeBlockEditor.test.ts
default_owner_email: gaetan@xeberon.net
---

## Tab, Shift+Tab and Enter indent and continue lists, quotes and fences

### Normative behavior

When a writer presses Tab, Shift+Tab or Enter in the text box of a block editor, the page SHALL indent or outdent every line touched by the selection, or continue the list marker, quote prefix or indentation of the current line, and leave the key to the text box when no rule applies.

### Scenario (nominal): Tab indents the lines touched by the selection
| Input | Outcome |
| --- | --- |
| Selection over the list lines `- a` and `- b` | Each gains two spaces (`  - a`, `  - b`); a numbered `1. a` gains three, `10. a` four |
| Selection over two prose lines | Each gains four spaces; a quote prefix stays in front; the editor stays open |
| Collapsed caret on the prose line `some prose` after `some` | The text becomes `some    prose` with the caret after the four spaces |
| Collapsed caret at the end of the list line `- a` | The whole line is indented by the marker width instead: `  - a` |

### Scenario (nominal): Shift+Tab outdents the touched lines
| Input | Outcome |
| --- | --- |
| `    - a` with the caret at its end | The line becomes `  - a` |
| `  - a` | The line becomes `- a` |
| `    plain` | The line becomes `plain` |
| `- a` (nothing to remove) | The text is unchanged, the key is still consumed and the editor stays open |

Up to one indentation unit, or one tab, is removed from the start of every touched line.

### Scenario (nominal): Enter continues the list marker
| Input | Outcome |
| --- | --- |
| `- a`, `* a` or `+ a` with the caret at the end | The next line starts with the same bullet and a space |
| `1. a` | The next line starts with `2. ` |
| `9) a` | The next line starts with `10) ` |
| An indented item | The next line keeps the indentation |
| `- [x] done` | The next item starts with `- [ ] ` (box reset) |
| `- ab` with the caret between a and b | The line splits into `- a` and `- b` |

### Scenario (nominal): Enter continues a quote prefix or the indentation
| Input | Outcome |
| --- | --- |
| `> quote` with the caret at its end | The next line starts with `> ` |
| `    code` with the caret at its end | The next line starts with four spaces |
| `plain` without indentation | The page leaves the key to the text box |

The list marker, the quote prefix and the indentation are the only constructs that Enter continues.

### Scenario (boundary): Enter on an empty list item or quote line
| Input | Outcome |
| --- | --- |
| The lines `a`, `  - ` and `b` with the caret on the empty item | The item line becomes empty and the caret sits on it |
| The line `>  ` with the caret at its end | The line becomes empty |

### Scenario (boundary): Enter inside a fenced code block
| Input | Outcome |
| --- | --- |
| `` ```\n  x `` with the caret after the x, inside the fence | The next line starts with two spaces |
| `` ```\n- a `` with the caret at the end of the last line | The key is left to the text box; after the closing fence a list is continued again |

Only the indentation of the current line is continued while an odd number of fence lines lies above the caret.

### Scenario (refusal): The key stays native
| Input | Outcome |
| --- | --- |
| Tab with Ctrl, Cmd or Alt held, or during an IME composition | The page does not handle the key; Ctrl+Tab still reaches VS Code |
| Shift+Enter at the end of a list item | The text box inserts a plain line break without a marker |
| Enter with Alt, Ctrl or Cmd, with a non-collapsed selection or during an IME composition | The page leaves the key to the text box |
| Enter with the caret before or inside the marker, as in `\|- a` or `-\| a` | The page does not continue the list |

### Verification notes
- Method: test/page/modules/textEditing.test.ts (`indentSelection indent ...` cases, including `some| prose` and `- a|`: Tab; `indentSelection outdent ...`: Shift+Tab; `continueOnEnter ...` cases, including `- |`, `a\n  - |\nb`, `>  |`, `> quote|`, `> - item|`, `    code|`, `plain|`, the fence cases, `|- a` and `-| a`, and `continueOnEnter leaves non-collapsed selections to the native behaviour`: Enter).
- Method: test/page/runtimeBlockEditor.test.ts (`Tab and Shift+Tab indent the block editor without closing it`: Tab and Shift+Tab; `Enter in a list item continues the list, and Shift+Enter stays native`: list marker and Shift+Enter; `Enter on an empty list item empties the line and Enter in plain text stays native`: empty item and plain text).
- Method: test/integration/realInput/markers.ts (scenarioTabIndents, screenshot block-editing/r10; scenarioEnterContinuesList, screenshot block-editing/r09); visual scenarios block-editing/v01 and v02 (Enter continues the list).
- Criteria: The edit equals the expected text of every case of the table in the unit test; only a non-list line receives spaces at the caret; an outdent without a removable character returns no edit; continueOnEnter returns no edit in the native cases; an odd number of fence lines above the caret switches to indentation-only continuation.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-008](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-008.md): A writer types and moves between blocks with text editor keys
<!-- okf:links:end -->
