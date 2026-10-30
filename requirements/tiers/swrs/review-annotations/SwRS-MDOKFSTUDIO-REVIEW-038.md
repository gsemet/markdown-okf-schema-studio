---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-038
uuid: 4a80fb13-0b4b-4162-a6e0-82cab820bc35
title: Selected body text offers a Comment button and a keyboard shortcut
description: When a reader selects text inside mapped body blocks of a writable
  preview, the page SHALL show a Comment button near the selection, and open the
  comment box for that selection on Cmd+Alt+M (macOS) or Ctrl+Alt+M (elsewhere).
project: markdown-okf-schema-studio
scope: review-annotations
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-003
- StRS-MDOKFSTUDIO-DIAG-001
- StRS-MDOKFSTUDIO-DIAG-006
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-001
- SwRS-MDOKFSTUDIO-BLOCK-041
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/commentCompose.ts
tested_in_files:
- test/page/modules/commentCompose.test.ts
- test/page/modules/diagReq.diagrams.requirements.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-DIAG-020
---

## Selected body text offers a Comment button and a keyboard shortcut

### Normative behavior

When a reader selects text inside mapped body blocks of a writable preview, the page SHALL show a Comment button near the selection, and open the comment box for that selection on Cmd+Alt+M (macOS) or Ctrl+Alt+M (elsewhere).

### Scenario (nominal): A selection in body blocks shows the button

| Given | When | Then |
| --- | --- | --- |
| a writable preview and a selection inside one paragraph | the selection is made | a button labelled "Add a comment on the selected text" and reading "Comment" appears near the selection range |
| a selection that starts in one paragraph and ends in another | the selection is made | the button appears |

### Scenario (refusal): No button for a collapsed selection or for text outside body blocks

| Input | Outcome |
| --- | --- |
| a caret without selected text | no button is shown |
| a selection ending inside a code block | no button is shown |
| a selection starting or ending in math | no button is shown |
| a selection ending inside the properties table | no button is shown |
| a selection ending inside an open editor | no button is shown |
| a selection ending inside a comment chip | no button is shown |
| a selection ending inside a thread popover | no button is shown |
| a selection ending inside included content | no button is shown |
| a selection in unmapped text | no button is shown |
| a selection inside a Mermaid or PlantUML figure | no button is shown |
| a selection inside an ordinary paragraph | the button is offered |

### Scenario (refusal): The button is hidden while busy

| Given | When | Then |
| --- | --- | --- |
| a selection being made with the mouse button held | the selection changes | no button is shown until the mouse button is released |
| a block editor open, or blocks selected | the selection changes | no button is shown |

### Scenario (nominal): Pressing the button keeps the selection

| Event | Outcome |
| --- | --- |
| mousedown on the Comment button | default-prevented and the selection is unchanged |
| mouseup and click events reaching the page | keep their default behaviour |

### Scenario (nominal): Copy and Shift+click keep working

| Input, with a selection that shows the button | Outcome |
| --- | --- |
| Cmd+C or Ctrl+C | the key event is not intercepted |
| Shift+click in the text | the click is not intercepted |

### Scenario (nominal): The keyboard shortcut opens the comment box

| Input | Outcome |
| --- | --- |
| Cmd+Alt+M or Ctrl+Alt+M with a selection in a paragraph (by key or by the physical M key) | the box opens and the key is consumed |
| the chord with no selection | no box opens and the key is left alone |
| the chord with Shift held | no box opens and the key is left alone |

### Verification notes

- Method: test/page/modules/commentCompose.test.ts (`T43: a selection inside one block shows the Comment button near the range and builds the anchor` and `T43: a selection across blocks anchors first block line to last block end line` check the first scenario; `T43: no button for a collapsed selection, code, properties, editors, chips, included content or unmapped text` checks the refusal table; `T43: the button is hidden while busy (block editor, block selection) and while the mouse drags` checks the busy scenario; `T43: the button never cancels the selection: mousedown is prevented, other mouse events are left alone` checks the press scenario; `T43: Cmd/Ctrl+C and Shift+click are not intercepted` checks the copy scenario; `T43: the keyboard shortcut opens the box for the current selection` checks the shortcut row with a selection); real window review-annotations/r04-thread-created (button and creation).
- Method: test/page/modules/diagReq.diagrams.requirements.test.ts (`a selection inside a Mermaid or PlantUML figure offers no comment; one in a paragraph does`: the figure row and the paragraph row).
- Untested: the shortcut with no selection and with Shift held.
- Criteria: A button with attribute data-okf-comment-create and the aria-label exists after a valid selection and no such element exists in each refusal case. The button disappears while the busy predicate is true or the pointer is down. Only the mousedown on the button is default-prevented. Neither Cmd/Ctrl+C nor Shift+click is default-prevented nor stopped. open() returns true only with a selection; only then the event is prevented. The compose skip list contains both figure classes.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-003](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-003.md): A reviewer comments, replies, resolves and deletes, and no comment is lost
  - [StRS-MDOKFSTUDIO-DIAG-001](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-001.md): A writer reads and inserts Mermaid diagrams that follow the theme
  - [StRS-MDOKFSTUDIO-DIAG-006](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-006.md): A writer reads PlantUML diagrams without any setup
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-001](../trust-security/SwRS-MDOKFSTUDIO-TRUST-001.md): A read-only preview offers no editing affordance
  - [SwRS-MDOKFSTUDIO-BLOCK-041](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-041.md): One edit at a time: an open editor blocks other edits, opens and refreshes
- Supersedes:
  - [SwRS-MDOKFSTUDIO-DIAG-020](../diagrams/SwRS-MDOKFSTUDIO-DIAG-020.md): Selecting text inside a diagram offers no comment
<!-- okf:links:end -->
