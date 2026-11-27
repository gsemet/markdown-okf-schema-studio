---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-038
uuid: 4a80fb13-0b4b-4162-a6e0-82cab820bc35
title: Selected body text offers a Comment button and a keyboard shortcut
description: When a reader selects text inside mapped body blocks of a preview,
  the page SHALL show a Comment button near the selection, and open the comment
  box for that selection on Cmd+Alt+M (macOS) or Ctrl+Alt+M (elsewhere).
project: markdown-okf-schema-studio
scope: review-annotations
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-003
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-001
- SwRS-MDOKFSTUDIO-BLOCK-041
scenarios:
- id: S1
  title: A selection in body blocks shows the button
- id: S2
  title: No button for a collapsed selection or for text outside body blocks
- id: S3
  title: The button is hidden while busy
- id: S4
  title: Pressing the button keeps the selection
- id: S5
  title: Copy and Shift+click keep working
- id: S6
  title: The keyboard shortcut opens the comment box
- id: S7
  title: The button follows the selection once per frame
- id: S8
  title: A scroll moves the button without reading the selection
- id: S9
  title: A scroll after the page changed under the selection shows what the
    selection then offers
- id: S10
  title: The shortcut pressed before the frame answers the selection as it is
    then
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/commentCompose.ts
- src/page/modules/shownContent.ts
tested_in_files:
- test/page/frameReadsInChromium.test.ts
- test/page/modules/commentCompose.test.ts
- test/page/modules/diagReq.diagrams.requirements.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-DIAG-020
---

## Selected body text offers a Comment button and a keyboard shortcut

### Normative behavior

When a reader selects text inside mapped body blocks of a preview, the page SHALL show a Comment button near the selection, and open the comment box for that selection on Cmd+Alt+M (macOS) or Ctrl+Alt+M (elsewhere).

### Scenario S1 (nominal): A selection in body blocks shows the button

| Given | When | Then |
| --- | --- | --- |
| a preview and a selection inside one paragraph | the selection is made | a button labelled "Add a comment on the selected text" and reading "Comment" appears near the selection range |
| a selection that starts in one paragraph and ends in another | the selection is made | the button appears |

### Scenario S2 (refusal): No button for a collapsed selection or for text outside body blocks

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

### Scenario S3 (refusal): The button is hidden while busy

| Given | When | Then |
| --- | --- | --- |
| a selection being made with the mouse button held | the selection changes | no button is shown until the mouse button is released |
| a block editor open, or blocks selected | the selection changes | no button is shown |

### Scenario S4 (nominal): Pressing the button keeps the selection

| Event | Outcome |
| --- | --- |
| mousedown on the Comment button | default-prevented and the selection is unchanged |
| mouseup and click events reaching the page | keep their default behaviour |

### Scenario S5 (nominal): Copy and Shift+click keep working

| Input, with a selection that shows the button | Outcome |
| --- | --- |
| Cmd+C or Ctrl+C | the key event is not intercepted |
| Shift+click in the text | the click is not intercepted |

### Scenario S6 (nominal): The keyboard shortcut opens the comment box

| Input | Outcome |
| --- | --- |
| Cmd+Alt+M or Ctrl+Alt+M with a selection in a paragraph (by key or by the physical M key) | the box opens and the key is consumed |
| the chord with no selection | no box opens and the key is left alone |
| the chord with Shift held | no box opens and the key is left alone |

### Scenario S7 (boundary): The button follows the selection once per frame

| Given | When | Then |
| --- | --- | --- |
| a selection that changes several times before the next animation frame | the frame runs | the selection is read once, and the button appears, moves or goes for the latest selection |
| a selection that changed, no shortcut pressed | before the next animation frame | the page does not read it yet |

### Scenario S8 (boundary): A scroll moves the button without reading the selection

| Given | When | Then |
| --- | --- | --- |
| the button shown, the page unchanged since the selection was read | the page scrolls | the button moves with the selected text and the selection is not read again |
| the button shown and a block editor opened or blocks selected, or the mouse button held | the page scrolls | the button goes |
| no button | the page scrolls | nothing is read and no button appears |

### Scenario S9 (boundary): A scroll after the page changed under the selection shows what the selection then offers

A change of the page is a change of the content, or a switch of the page that shows or hides part of it. The browser announces no selection change for most of them.

| Given the button shown, and | When | Then |
| --- | --- | --- |
| the page removed or hid the selected text, so that it offers no comment | the page scrolls | the button goes, and the shortcut opens no box |
| the page removed or hid it, and a scroll has removed the button | the text shows again and the page scrolls | no button comes back |
| the page changed and the selection still offers a comment | the page scrolls | the button moves with the selected text |
| several changes of the page before the next animation frame | the frame runs, then the page scrolls | the selection is read once, at that frame, and no scroll reads it |

### Scenario S10 (boundary): The shortcut pressed before the frame answers the selection as it is then

| Given the button shown, then a selection change and no animation frame yet | Input | Outcome |
| --- | --- | --- |
| the selection collapsed | Cmd+Alt+M or Ctrl+Alt+M | no box opens, the key is left alone and the button goes |
| a selection that offers no comment, such as one inside a code block | Cmd+Alt+M or Ctrl+Alt+M | no box opens, the key is left alone and the button goes |
| another selection that offers a comment | Cmd+Alt+M or Ctrl+Alt+M | the box opens on that selection and the key is consumed |

### Verification notes

- Method: test/page/modules/commentCompose.test.ts (`T43: a selection inside one block shows the Comment button near the range and builds the anchor` and `T43: a selection across blocks anchors first block line to last block end line` check the first scenario; `T43: no button for a collapsed selection, code, properties, editors, chips, included content or unmapped text` checks the refusal table; `T43: the button is hidden while busy (block editor, block selection) and while the mouse drags` checks the busy scenario; `T43: the button never cancels the selection: mousedown is prevented, other mouse events are left alone` checks the press scenario; `T43: Cmd/Ctrl+C and Shift+click are not intercepted` checks the copy scenario; `T43: the keyboard shortcut opens the box for the current selection` checks the shortcut row with a selection); real window review-annotations/r04-thread-created (button and creation).
- Method: test/page/modules/diagReq.diagrams.requirements.test.ts (`a selection inside a Mermaid or PlantUML figure offers no comment; one in a paragraph does`: the figure row and the paragraph row).
- Method: test/page/modules/commentCompose.test.ts (`selection changes between two frames are answered once, at the frame`: the once-per-frame table; `a scroll moves the Comment button with its text and does not read the selection again` and `a scroll hides the Comment button while the pointer is down or the page is busy, as a selection change does`: the first two scroll rows).
- Method: test/page/modules/commentCompose.test.ts (`the shortcut pressed before the frame answers the selection as it is then, collapsed or changed`: the three rows of the shortcut table, and that the frame after them reads nothing again).
- Method: in Chromium on the real preview, in the `visual` CI job, test/page/frameReadsInChromium.test.ts (`a scroll after the page took away or hid the selected text removes the Comment button`: the first three rows of the change table; `a change of the page has the selection read again, once, and a scroll never does`: its last row and the first scroll row, in read and edit mode).
- Untested: the shortcut with no selection and with Shift held; a scroll with no button.
- Criteria: A button with attribute data-okf-comment-create and the aria-label exists after a valid selection and no such element exists in each refusal case. The button disappears while the busy predicate is true or the pointer is down. Only the mousedown on the button is default-prevented. Neither Cmd/Ctrl+C nor Shift+click is default-prevented nor stopped. open() returns true only with a selection; only then the event is prevented. The compose skip list contains both figure classes. A scroll calls no getRangeAt of the selection; the changes of one task cause one call. open() before the frame of a selection change reads the selection first, and that frame then reads nothing.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-003](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-003.md): A reviewer comments, replies, resolves and deletes, and no comment is lost
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-001](../trust-security/SwRS-MDOKFSTUDIO-TRUST-001.md): A document is editable whatever the trust; only its reads are restricted
  - [SwRS-MDOKFSTUDIO-BLOCK-041](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-041.md): One edit at a time: an open editor blocks other edits, opens and refreshes
- Supersedes:
  - [SwRS-MDOKFSTUDIO-DIAG-020](../diagrams/SwRS-MDOKFSTUDIO-DIAG-020.md): Selecting text inside a diagram offers no comment
<!-- okf:links:end -->
