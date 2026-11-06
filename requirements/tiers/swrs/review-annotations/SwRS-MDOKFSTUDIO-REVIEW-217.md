---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-217
uuid: b91f0f44-06fe-41bf-add1-c931d7348dd0
title: The comment editors stay inside the window and follow their text
description: When a reader opens the new comment box or the thread popover with
  its reply box, the page SHALL place it entirely inside the window, below its
  anchored text or above it when there is no room below, and SHALL move it with
  that text on every scroll, even when the text is out of view.
project: markdown-okf-schema-studio
scope: review-annotations
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/commentCompose.ts
- src/page/modules/commentEditorBehaviour.ts
- src/page/modules/commentThreads.ts
tested_in_files:
- test/page/modules/commentEditorBehaviour.test.ts
default_owner_email: gaetan@xeberon.net
---

## The comment editors stay inside the window and follow their text

### Normative behavior

When a reader opens the new comment box or the thread popover with its reply box, the page SHALL place it entirely inside the window, below its anchored text or above it when there is no room below, and SHALL move it with that text on every scroll, even when the text is out of view.

### Scenario (nominal): The editor opens next to its text, inside the window

| Given | When | Then |
| --- | --- | --- |
| text with room below it for the editor | the new comment box or the thread popover opens | the editor sits 6 px below the text |
| text near the bottom, no room below, room above | the editor opens | the editor sits 6 px above the text and is entirely inside the window |
| text in view, no room above or below | the editor opens | the editor is moved up so its bottom edge is 8 px above the bottom of the window, and at least 8 px from the top |
| a window narrower than the editor | the editor opens | the editor is as wide as the window minus 16 px, and at least 8 px from each side |

### Scenario (nominal): The editor follows its text on scroll

- GIVEN an open new comment box or thread popover holding a draft
- WHEN the page, or any scrolling container, scrolls
- THEN the editor is placed again from the current position of its text, so it moves with the text, and keeps its draft
- AND WHEN the text scrolls out of view, THEN the editor leaves the window with it and stays open
- AND WHEN the text scrolls back, THEN the editor is back next to it

### Scenario (boundary): The editor grows

When an error line or the Discard question is added to the new comment box, or a Discard question to the thread popover, the editor is placed again so that it stays inside the window.

### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-044: the new comment box.
- SwRS-MDOKFSTUDIO-REVIEW-021: the thread popover, its width and its left edge.
- SwRS-MDOKFSTUDIO-REVIEW-218: closing the editors.

### Verification notes

- Method: test/page/modules/commentEditorBehaviour.test.ts, unit tests `CR 265: a new comment box near the bottom of the window opens above its text, entirely visible`, `CR 265: a new comment box with room below stays below its text`, `CR 265: a new comment box follows its text on scroll, even off screen, and keeps the draft`, `CR 265: the thread popover with its reply box near the bottom of the window opens above its text` and `CR 265: the thread popover follows its text on scroll and keeps the reply draft` (editors of 200 px in a window of 600 px; the rectangle of the text is read again at every scroll).
- Untested: the no-room-above case and the narrow window, the placement after an error line or the Discard question, and the real pixel layout (no window test ran).
- Criteria: `floatingTop` returns the bottom of the text plus 6 when the editor fits below with an 8 px edge, else the top of the text minus 6 minus the editor height when that is at least 8, else the window height minus the editor height minus 8, at least 8; when the text is entirely out of view it returns the bottom of the text plus 6 unclamped. A capture listener on scroll of the document places the open editor again. The editor is never closed by a scroll.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-003](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-003.md): A reviewer comments, replies, resolves and deletes, and no comment is lost
<!-- okf:links:end -->
