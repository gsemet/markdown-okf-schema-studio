---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-261
uuid: 6a586aa3-5b28-4cc8-b1bc-dd09bb1072b8
title: A one-line editor commits on Enter and ignores Tab
description: 'When the writer presses Enter in an editor opened on a card title, :header:
  or :footer: line, the page SHALL save the line and close the editor as Done does,
  and Shift+Enter, Alt+Enter, Tab and Shift+Tab SHALL insert and save nothing and
  leave the editor open, so that no blank line ends the options of the card.'
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-008
scenarios:
- id: S1
  title: Enter saves a one-line card editor
- id: S2
  title: Other one-line editors keep Enter as a new line
annotation_exemption: false
exemption_reason:
derived_by: []
supersedes:
- SwRS-MDOKFSTUDIO-BLOCK-258
implemented_in_files:
- src/page/features/blockEditor.ts
- src/page/features/blockSourceEditor.ts
tested_in_files:
- test/integration/realInput/qa210Replays.ts
- test/page/runtimeCardOptionEnter.test.ts
- test/visual/cardsTabsScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## A one-line editor commits on Enter and ignores Tab

### Normative behavior

In an editor opened on a card title, `:header:` or `:footer:` line (an editor whose block carries the one-line marker of SwRS-MDOKFSTUDIO-BLOCK-260), plain Enter SHALL save and close the editor as Done does, Shift+Enter and Alt+Enter SHALL insert nothing, save nothing and leave the editor open, and Tab and Shift+Tab SHALL do nothing, so that no blank line ends the options of the card; the status hint of that editor SHALL read "Line N · Enter: done · Esc: cancel · ⌘↩: done".

### Scenario S1 (nominal): Enter saves a one-line card editor

- GIVEN edit mode on a `{card}` whose line 18 is `:header: Since v2.1.154, published 2026-05-28` and line 19 `:footer: Documented in the workflows guide`
- WHEN the writer clicks the header, presses End, types " Q" and presses Enter
- THEN the editor saves the single line `:header: Since v2.1.154, published 2026-05-28 Q` and closes, as Done or Cmd/Ctrl+Enter does: the document changes one line (-1 +1) and `:footer:` still follows the header line, with no blank line between them

| Input in an editor opened on a card title, `:header:` or `:footer:` line | Outcome |
| --- | --- |
| Enter (no modifier, no composition in progress) | The line is saved and the editor closes; no newline is inserted |
| Shift+Enter | Nothing is inserted and the editor stays open |
| Alt+Enter or Alt+Shift+Enter | Ignored like Shift+Enter: nothing is inserted, nothing is saved and the editor stays open |
| Cmd/Ctrl+Enter | The line is saved and the editor closes (done, as in any block editor) |
| Tab or Shift+Tab | Nothing happens: the line is neither indented nor outdented and the focus stays in the editor |
| Enter while the slash menu, a palette popup or the alt text of an image takes the key | That control handles Enter, as in any block editor |

### Scenario S2 (boundary): Other one-line editors keep Enter as a new line

- GIVEN an editor opened on a one-line paragraph or a one-line heading (its first and last lines are the same)
- WHEN the writer presses Enter or Shift+Enter
- THEN the text box inserts a newline as in every other block editor: only the parts the renderer marks as one-line card parts (`data-single-line`) take Enter as done, never a block found one-line by its line range; a linked card title is mapped to its directive line and is marked single-line like any card title

### Related requirements

- SwRS-MDOKFSTUDIO-BLOCK-260: the parts the renderer marks as one-line card parts
- SwRS-MDOKFSTUDIO-BLOCK-033: the status line that shows the hint

### Verification notes

- Method: test/page/runtimeCardOptionEnter.test.ts drives the page runtime on an element marked as the renderer marks a card title, `:header:` or `:footer:` part: Enter is taken over and sends one final save of the single line, Shift+Enter, Alt+Enter and Alt+Shift+Enter are taken over and save nothing, Tab and Shift+Tab are taken over and leave the line as it is, Enter with the slash menu open goes to the menu and saves nothing, the status hint reads "Line 50 · Enter: done · Esc: cancel" before the done key, and a one-line paragraph or heading keeps Enter, Shift+Enter, Tab and its hint. The visual scenario `block-editing/v35-card-header-enter-commits-line-cream-900` clicks the header of fixture 68, presses End, types " Q" and presses Enter with real key input, and checks the one final save and the saved buffer.
- Criteria: one final save of the single line for Enter, nothing saved and no newline for Shift+Enter, Alt+Enter and Tab, the hint text, and the newline kept in an editor of a one-line paragraph or heading.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-008](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-008.md): A writer types and moves between blocks with text editor keys
- Supersedes:
  - [SwRS-MDOKFSTUDIO-BLOCK-258](SwRS-MDOKFSTUDIO-BLOCK-258.md): A click on a card title or option opens the editor on its own line, the title is inline text and Enter saves a one-line editor
<!-- okf:links:end -->
