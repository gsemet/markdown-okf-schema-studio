---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-266
uuid: 2ff30119-54b8-4fc5-9ea5-ba3c9065419e
title: Cmd or Ctrl with the slash key toggles a plain HTML comment on the
  touched lines
description: When the writer presses Cmd+/ or Ctrl+/, with or without Shift, in
  a block text box, the extension SHALL wrap each non-blank touched line in a
  plain HTML comment, or unwrap them when every non-blank touched line is
  already a plain comment, as one undo step.
project: MDOKFSTUDIO
scope: palette-slash
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/palette/paletteActions.ts
- src/page/modules/editActions.ts
- src/page/modules/inlineEditActions.ts
tested_in_files:
- test/page/modules/commentToggle.test.ts
- test/page/runtimeBlockEditor.test.ts
default_owner_email: gaetan@xeberon.net
---

## Cmd or Ctrl with the slash key toggles a plain HTML comment on the touched lines

### Normative behavior

When the writer presses Cmd+/ or Ctrl+/, with or without Shift, in a block text box, the extension SHALL wrap each non-blank touched line in a plain HTML comment, or unwrap them when every non-blank touched line is already a plain comment, as one undo step.

### Scenario (nominal): Caret in a line

- GIVEN the text "abc" with the caret inside, in a block editor
- WHEN the writer presses Ctrl+/ (Cmd+/ on macOS)
- THEN the line reads "`<!-- abc -->`", the caret stays on the same letter, and one undo restores "abc"

### Scenario (nominal): Selection of lines, and unwrap

| Input | Outcome |
| --- | --- |
| The lines "a" and "b" selected | Both lines are wrapped, each after its own indentation |
| The lines "`<!-- a -->`" and "`<!-- b -->`" selected | The lines read a and b |
| The lines "a" and "`<!-- b -->`" selected | The first line is wrapped and the second stays a single comment |

### Scenario (boundary): Blank line and TODO comments

| Input | Outcome |
| --- | --- |
| An empty line with the caret | The line reads "`<!--  -->`" with the caret between the spaces |
| An empty comment with the caret inside it | The comment is removed |
| The line "`<!-- TODO: a -->`" | No edit is made: the shortcut removes only the plain comments it adds, and the TODO action unwraps TODO comments |

### Scenario (refusal): Keys and lines that do nothing

| Input | Outcome |
| --- | --- |
| Ctrl+Alt+/ (Alt held) | The shortcut is not matched |
| A line holding "-->" that is not a plain comment | The line is left alone |
| The shortcut in a table cell | Nothing happens, see SwRS-MDOKFSTUDIO-TABLE-085 |

The TODO palette button and the slash menu entry keep inserting `<!-- TODO: … -->` with no shortcut and no shortcut in the tooltip, see SwRS-MDOKFSTUDIO-REVIEW-160. The shortcut has no palette button and no slash menu entry.

### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-160: the TODO action, which has no shortcut.
- SwRS-MDOKFSTUDIO-PALETTE-083: the other shortcuts and the tooltip rule.
- SwRS-MDOKFSTUDIO-TABLE-085: the shortcut does nothing in a table cell.

### Verification notes

- Method: test/page/modules/commentToggle.test.ts (the table cases generated as `editActions comment ` plus the input; `the comment toggle is its own inverse and never wraps a line holding -->`)
- Method: test/page/modules/editActions.test.ts (`shortcutFor accepts Ctrl+/ and Cmd+/ on every platform`; `shortcutFor ignores plain keys, other modifiers, composition and AltGr`; the registry test for the shortcut-only comment action)
- Method: test/page/runtimeBlockEditor.test.ts (Ctrl+/ in the real block editor text box)
- Criteria: The produced text equals the expected text for each case, shortcutFor returns the comment action for either modifier with or without Shift and nothing with Alt, and the comment action has no palette button and no slash entry.
