---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-218
uuid: 2199e4b6-f51f-42c3-b03c-940375d6fe1a
title: Escape or a press outside closes a comment editor and asks before
  dropping a draft
description: When a reader presses Escape, wherever the focus is, or presses
  outside while the new comment box or the reply box of the thread popover is
  open, the page SHALL close it at once when its text is blank, and SHALL
  otherwise ask Discard or Keep editing inside the editor, without
  window.confirm, and drop the text only on Discard.
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
- test/page/modules/commentCompose.test.ts
- test/page/modules/commentEditorBehaviour.test.ts
default_owner_email: gaetan@xeberon.net
---

## Escape or a press outside closes a comment editor and asks before dropping a draft

### Normative behavior

When a reader presses Escape, wherever the focus is, or presses outside while the new comment box or the reply box of the thread popover is open, the page SHALL close it at once when its text is blank, and SHALL otherwise ask Discard or Keep editing inside the editor, without window.confirm, and drop the text only on Discard.

### Scenario (nominal): Escape and a press outside close a blank editor

| Given | When | Then |
| --- | --- | --- |
| an open new comment box with no text, or only spaces, and the focus anywhere | the reader presses Escape | the box closes, nothing is sent and the event is stopped from reaching other handlers |
| the same box | the reader presses the mouse or a pointer outside the box (not on the Comment button) | the box closes and nothing is sent |
| an open thread popover whose reply box has no text | the reader presses Escape, or presses outside the popover and outside the highlights | the popover closes |
| an open box or popover | the reader presses inside it | nothing is asked and nothing closes |

### Scenario (nominal): A changed draft is asked about, inside the editor

- GIVEN an open new comment box, or a thread popover, whose text area holds text that is not blank
- WHEN the reader presses Escape, wherever the focus is, or presses outside the editor
- THEN the editor stays open with its text, and a group named "Discard this comment?" (box) or "Discard this reply?" (popover) shows two buttons, Discard and Keep editing; in the box it replaces Save and Cancel
- AND WHEN the reader presses Keep editing, THEN the question goes, the text stays and the text area has the focus
- AND WHEN the reader presses Discard, THEN the editor closes and nothing is sent
- AND `window.confirm` is never called

### Scenario (boundary): While the question shows

| Input | Outcome |
| --- | --- |
| Escape | the question goes and the editor stays open with its text, as Keep editing |
| another press outside | the one question stays, no second one is added |
| the threads are posted again while the popover asks | the popover for the same thread asks again |
| the reader presses the highlight of the same thread, or of another thread, while the popover holds a changed draft | the popover asks and does not close or switch |
| Cancel in the new comment box | the box closes without a question (Cancel is the explicit answer) |

### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-044: Save, Cancel and the answer of the host.
- SwRS-MDOKFSTUDIO-REVIEW-021: opening the thread popover.
- SwRS-MDOKFSTUDIO-REVIEW-217: the place of the editors.

### Verification notes

- Method: test/page/modules/commentEditorBehaviour.test.ts, unit tests `CR 265: Escape closes an empty or unchanged comment box wherever the focus is`, `CR 265: Escape on a changed comment draft asks Discard or Keep editing, then acts on the answer`, `CR 265: a press outside closes an unchanged comment box and asks about a changed one`, `CR 265: Escape on a changed reply draft asks Discard or Keep editing` and `CR 265: a press outside the popover asks about a changed reply draft and closes an empty one`; test/page/modules/commentCompose.test.ts, `T43: Escape cancels the box, Cmd/Ctrl+Enter saves, an empty body posts nothing` (a blank box and Escape).
- Untested: Escape while the question shows, the question surviving a re-apply, the highlight pressed with a changed draft, and Cancel with a changed draft; no window test ran.
- Criteria: a draft is changed when its trimmed text is not empty. The question is built with textContent; its buttons carry data-okf-comment-discard-yes and data-okf-comment-discard-keep. The keydown handler for Escape runs for any target while a box or popover is open and stops the event. pointerdown and mousedown outside act once: a second press finds the question or no editor.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-003](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-003.md): A reviewer comments, replies, resolves and deletes, and no comment is lost
<!-- okf:links:end -->
