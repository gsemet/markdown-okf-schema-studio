---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-044
uuid: e9332166-f796-4629-9afe-08cbdfbdf596
title: The comment box sends a comment and keeps its text until the host accepts
  it
description: When a reader writes a comment in the comment box, the page SHALL
  send the typed text to the host only on Save, Cmd+Enter or Ctrl+Enter with a
  text that is not blank, and keep the box and its text open until the host
  answers that the comment is saved.
project: markdown-okf-schema-studio
scope: review-annotations
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-003
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-090
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/commentCompose.ts
- src/session/features/comments.ts
tested_in_files:
- test/core/comments/commentEditing.test.ts
- test/page/modules/commentCompose.test.ts
default_owner_email: gaetan@xeberon.net
---

## The comment box sends a comment and keeps its text until the host accepts it

### Normative behavior

When a reader writes a comment in the comment box, the page SHALL send the typed text to the host only on Save, Cmd+Enter or Ctrl+Enter with a text that is not blank, and keep the box and its text open until the host answers that the comment is saved.

### Scenario (nominal): Box content

When the comment box opens, the page shows a dialog named New comment holding the quoted text, a text area labelled Comment with the placeholder Write a comment and a limit of 10 000 characters, and Save and Cancel buttons.

| Input | Outcome |
| --- | --- |
| A selection of the words "second paragraph" and the box opens | The dialog shows those words, an empty text area with the focus, Save and Cancel |
| A selection whose text looks like HTML and the box opens | The quote and the typed text are set as text, never as markup |

### Scenario (nominal): Save or Cmd/Ctrl+Enter sends the comment

- GIVEN a box holding the text "Why?"
- WHEN the reader presses Save, or presses Cmd+Enter or Ctrl+Enter in the box
- THEN a create message with the anchor of the selection and the body Why? is sent, exactly one per save, and Save is disabled until the host answers

### Scenario (refusal): Empty or blank text is not sent

- GIVEN an empty box, or a box holding only spaces
- WHEN the reader presses Save, or presses Cmd+Enter
- THEN no message is sent and the box stays open

### Scenario (nominal): Escape or Cancel closes the box

| Input | Outcome |
| --- | --- |
| An open box with typed text and the reader presses Escape | The box closes and nothing is sent |
| An open box and the reader presses Cancel | The box closes, nothing is sent, and the selection state is looked at again |

### Scenario (boundary): Keys typed in the box stay in the box

| Input | Outcome |
| --- | --- |
| The reader types a letter that is also a shortcut in the open box | The letter goes to the text area, each key event is stopped, and no other key handler of the page acts |
| A key is pressed outside the box and it is not the comment chord | The event is left alone |

### Scenario (nominal): A saved comment closes the box

| Input | Outcome |
| --- | --- |
| A box waiting for the host, and the host answers a create with ok true | The box closes and the text selection is cleared |
| An answer of another kind arrives | The answer is ignored and the box stays |
| An answer arrives with no save pending | The answer is ignored and the box stays |

### Scenario (refusal): A refused comment keeps the box and its text

- GIVEN a box waiting for the host
- WHEN the host answers a create with ok false and the reason "the comments file is full."
- THEN the box and the text stay, an alert shows the reason as text (cut at 500 characters) and Save is enabled again

| Input | Outcome |
| --- | --- |
| The answer ok false has no reason | The alert reads "The comment was not saved." |

### Scenario (refusal): No answer from the host after 15 seconds

- GIVEN a box waiting for the host
- WHEN 15 seconds pass without an answer
- THEN the alert reads "No answer from the editor. Your text is kept: try Save again.", the box and the text stay and Save is enabled
- AND WHEN the host answers ok true later, THEN the box closes

### Scenario (refusal): The host answers a blank or invalid comment as empty

When a create or reply message passes the protocol with a body that is blank or over 10 000 characters, the host answers ok false and writes nothing.

| Input | Outcome |
| --- | --- |
| A create message with the body of three spaces | The page is told "the comment is empty or too long." and no thread is written |
| A reply message with the body of three spaces | The page is told "the reply is empty or too long." |
| A create message whose anchor is not valid (lines, quote of at most 500 characters, prefix and suffix of at most 32 characters) | The page is told "the comment is empty or too long." |

### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-038: the Comment button and the keyboard shortcut open the box.
- SwRS-MDOKFSTUDIO-REVIEW-049: the anchor that the create message carries.
- SwRS-MDOKFSTUDIO-REVIEW-054: the host writes the comment and refuses it with the reasons shown here.
- SwRS-MDOKFSTUDIO-REVIEW-069: the accepted shape of the create message.

### Verification notes

- Method: test/page/modules/commentCompose.test.ts, unit tests `T43: typing in the box is not seen by other key handlers, and the box text is data` (Box content, Keys typed in the box stay in the box), `T43: Escape cancels the box, Cmd/Ctrl+Enter saves, an empty body posts nothing` (Save or Cmd/Ctrl+Enter sends the comment, Empty or blank text is not sent, Escape or Cancel closes the box), `T43 r2: results of other kinds, or without a pending save, are ignored` (A saved comment closes the box), `T43 r2: a refused save keeps the box and the text, shows the reason as text and allows a retry` (A refused comment; the default text is not asserted), `T43 r2: no answer in time keeps the text, says so, and a late ok still closes the box` (No answer from the host).
- Method: real window review-annotations/r04-thread-created (Box content, Save sends the comment, A saved comment closes the box).
- Method: test/core/comments/commentEditing.test.ts, unit test `T43: normalizeBody trims and enforces 1 to 10000 characters` (the trimming and length rule of The host answers a blank or invalid comment as empty); the handler answers themselves are untested.
- Criteria: The dialog holds a textarea with maxlength 10000 and two buttons; the quote is set with textContent. Exactly one create message is posted per save and the post hook is not called for a trimmed empty body. stopImmediatePropagation is called for keydown inside the box only. The result handler returns true and closes only for a create answer while a save is pending. The error line has role alert and holds the reason cut at 500 characters. The no-answer message appears after ANSWER_TIMEOUT_MS = 15000 and a late answer closes the box. The placeholder and the length limit are not asserted. normalizeBody returns undefined for a blank body and the host answers with the reason, without a warning.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-003](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-003.md): A reviewer comments, replies, resolves and deletes, and no comment is lost
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-005](../trust-security/SwRS-MDOKFSTUDIO-TRUST-005.md): The host refuses every write request of a read-only preview with a reason
  - [SwRS-MDOKFSTUDIO-TRUST-090](../trust-security/SwRS-MDOKFSTUDIO-TRUST-090.md): Every page request is answered once by its id and result type, or ends with a readable error
<!-- okf:links:end -->
