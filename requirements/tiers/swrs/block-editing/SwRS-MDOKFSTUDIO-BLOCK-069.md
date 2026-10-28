---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-069
uuid: 5f6a88c5-f2cd-4df4-ba73-d0fe092475a4
title: Marker keys wrap a selection; Home, End, select-all and undo stay in the
  text box
description: When a writer presses a key in the text box of an open editor, the
  page SHALL give it the text-box behaviour of its row in the scenarios (wrap a
  selection, caret to the start or the end, select-all, undo, repeated spaces
  and Enter typed as they are, except in the alt text of an image, where it
  validates it), apply every text change as a native undoable edit and keep a
  key the editor handled from reaching VS Code.
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-008
- StRS-MDOKFSTUDIO-BLOCK-025
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/blockSourceEditor.ts
- src/page/features/textControls.ts
- src/page/modules/editorKeys.ts
- src/page/modules/linkEditActions.ts
- src/page/modules/selectAllKey.ts
- src/page/modules/textEditing.ts
tested_in_files:
- test/integration/realInput/markers.ts
- test/page/blockReq.requirements.test.ts
- test/page/modules/editActions.test.ts
- test/page/modules/editorKeys.test.ts
- test/page/modules/selectAllKey.test.ts
- test/page/modules/textEditing.test.ts
- test/page/runtimeBlockEditor.test.ts
- test/visual/scenarioDefinitions1.ts
default_owner_email: gaetan@xeberon.net
---

## Marker keys wrap a selection; Home, End, select-all and undo stay in the text box

### Normative behavior

When a writer presses a key in the text box of an open editor, the page SHALL give it the text-box behaviour of its row in the scenarios (wrap a selection, caret to the start or the end, select-all, undo, repeated spaces and Enter typed as they are), apply every text change as a native undoable edit and keep a key the editor handled from reaching VS Code.

### Scenario (nominal): Typing * _ backtick or ~ over a selection wraps it
- GIVEN the word `foo` selected in `a foo b`
- WHEN the writer types * and then * again
- THEN the text becomes `a *foo* b` and then `a **foo** b`, with `foo` still selected each time (the selection start and the selection end each move by one after every wrap), and the same holds for _, a backtick and ~

### Scenario (refusal): Marker keys stay native
| Input | Outcome |
| --- | --- |
| The caret in the text box with nothing selected, the writer types * | A single * is typed |
| A wrap marker typed with Cmd, Ctrl or Alt held | The key stays native in the text box |
| A wrap marker typed during an IME composition | The key stays native in the text box |
| A keyboard layout whose AltGr reports ctrlKey and altKey, ~ or a backtick typed with AltGr over a selection | The selection is wrapped |
| Plain Ctrl+Alt with a marker over a selection | The selection is not wrapped |

### Scenario (nominal): Editor key edits keep the browser undo stack
- GIVEN a list item continued with Enter, or an indentation by Tab, a marker wrap or a palette shortcut
- WHEN the writer undoes in the text box
- THEN the new line or the change disappears and the editor stays open, because the page applied the change through the native insertText or delete command first

### Scenario (boundary): No native editing command
| Input | Outcome |
| --- | --- |
| A browser where the editing command is unavailable, the writer types * over a selection | The page splices the text directly, keeps the selection and autosaves |
| A browser without the editing command, an editor key changes the text | The page splices the value and still posts the autosave |

### Scenario (boundary): Home, End and their Shift forms
| Input | Outcome |
| --- | --- |
| End in a text box whose text ends with a line break | The caret sits after the last visible character, before the line break, and the preview does not scroll |
| Home | The caret moves to the start of the text and the preview does not scroll |
| Shift+End with the caret in the middle of the text | The text from the caret to the end, without trailing line breaks, is selected forward |
| Shift+Home with a backward selection | The selection keeps its anchor and extends backward to the start |
| Home with Cmd, Ctrl or Alt held, or during a composition | The key stays native |

### Scenario (nominal): Undo and redo stay in the text box
| Input | Outcome |
| --- | --- |
| An editor with typed text, the writer presses Cmd+Z or Ctrl+Z | The typing is undone in the text box only and the editor stays open and focused; in a block or table-cell text box the undo runs through VS Code's key binding (SwRS-MDOKFSTUDIO-BLOCK-003), in a frontmatter field the key stops at the page and the text box undoes natively |
| The same keys with Shift+Z or Y | The same for redo: through the key binding in a block or table-cell text box, natively in a frontmatter field |
| The preview opened through Open With, and then side by side, the same keys | The result is the same in both |

### Scenario (boundary): Repeated spaces and Enter are typed as they are
| Input | Outcome |
| --- | --- |
| A nested list editor in the dark theme at 460 px, the writer types six spaces, Enter and a word | The text holds exactly those characters, the focus and the caret stay at the end and the autosave carries the exact text with its newline |
| The same editor in the light theme at 900 px, the same keys | The same exact text is saved |

### Scenario (nominal): Handled keys stop at the document
| Input | Outcome |
| --- | --- |
| A keydown of Enter in an editor whose listener prevented the default (Tab, Escape and the arrow keys likewise) | It stops at the document and the default stays prevented, so VS Code runs no shortcut for it |
| Cmd+A on macOS or Ctrl+A elsewhere in a frontmatter field | The propagation stops, the default is not prevented and the control selects its own text |
| Cmd+A on macOS or Ctrl+A elsewhere in a block or table-cell text box | The page cancels the native action, the document does not stop the key and VS Code's key binding selects the text of the text box (SwRS-MDOKFSTUDIO-BLOCK-003) |

### Scenario (nominal): Enter in the alt text of an image validates it
| Input | Outcome |
| --- | --- |
| An image pasted or picked, so that its alt text is selected, as in `![image.png](image.png)`, the writer presses Enter | The text is unchanged and the caret sits just after the closing parenthesis of the image; no line break is typed |
| The caret inside the alt text after the writer typed there, Enter | The same: the alt text is kept and the caret moves just after the image |
| Shift+Enter, Cmd+Enter or Ctrl+Enter in the alt text | Not this rule: Shift+Enter stays native, Cmd/Ctrl+Enter is Done |
| Enter with the caret outside the alt text of an image (in the path, before the image or in other text) | Enter keeps its other behaviour in the row above |

### Scenario (refusal): Keys that go on to VS Code
| Input | Outcome |
| --- | --- |
| A keydown of Ctrl+Tab | The page does not stop it, so Ctrl+Tab still switches tabs in VS Code |
| An arrow key whose default was not prevented | The page does not stop it |
| Enter during an IME composition | The page does not stop it |
| Ctrl+Shift+A, Alt+A, or Ctrl+A on macOS | The page does not stop it |
| Ctrl+A (Cmd+A on macOS) outside a text control | The page does not stop it |

### Related requirements
- SwRS-MDOKFSTUDIO-BLOCK-079: arrow keys at the edges of the text box leave the editor
- SwRS-MDOKFSTUDIO-BLOCK-003: undo, redo, select all and delete line in a block or table-cell text box run through VS Code key bindings

### Verification notes
- Method: test/page/modules/textEditing.test.ts (wrap of a selection, nominal; caret and invalid ranges, refusal)
- Method: test/page/runtimeBlockEditor.test.ts (wrap and wrap again, refusal of native marker keys and AltGr, undo stack, no editing command, undo and redo shortcuts, repeated spaces and Enter); visual scenario block-editing/v03 (wraps, undo and redo) and visual scenarios block-editing/v01 and v02 (one assertion family, repeated spaces and Enter)
- Method: test/page/runtimeBlockEditor.test.ts (CR 118: Enter in the selected alt text of an image keeps the text and moves the caret after the image, and Enter outside the alt text stays native); test/page/modules/editActions.test.ts (imageAltExit); visual scenarios palette-slash/v22, v23 (cream) and v24 (dark) press Enter on the alt text selected after an image paste
- Method: test/page/blockReq.requirements.test.ts (Home and End, Shift with Home or End)
- Method: test/integration/realInput/markers.ts (real-input scenario scenarioUndoStaysInEditor, screenshots block-editing/r07 in Open With and r08 side by side; scenarioEnterContinuesList); Chromium undoes by word, so a trailing space may remain after one undo
- Method: test/page/modules/editorKeys.test.ts (handled keys stop at the document, keys no editor handled keep reaching VS Code); the same containment serves the table cell and the field editors
- Method: test/page/modules/selectAllKey.test.ts (select-all in a text control stops at the document, other shortcuts do not); the same rule serves the table cell editor and the field editors
- Criteria: wrapSelection returns no edit for a caret, other keys and invalid ranges; applyTextEdit calls the native insertText or delete command first; the selection range is set to 0 or to the length without trailing line breaks; setSelectionRange is called with the anchor kept and the direction set; stopPropagation is called for the undo and redo keys and no default is prevented; the autosave text equals the typed text plus the trailing newline; isHandledEditorKey is true only for Tab, Enter, Escape and the arrow keys inside an editor frame with defaultPrevented true; isTextSelectAll is true for textarea, text-like input and editable elements only
