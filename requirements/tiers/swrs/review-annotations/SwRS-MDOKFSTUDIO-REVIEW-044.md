---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-044
uuid: e9332166-f796-4629-9afe-08cbdfbdf596
title: "A comment editor sends its text on Save or Cmd+Enter and keeps it until the
  host accepts it"
description: "When a reader writes a comment in the comment box or a reply in the
  reply box of a thread popover, the page SHALL send the typed text to the host only
  on Save or Reply, Cmd+Enter or Ctrl+Enter with a text that is not blank, and keep
  the box and its text until the host answers that the text is saved."
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
- SwRS-MDOKFSTUDIO-TRUST-001
- SwRS-MDOKFSTUDIO-BLOCK-041
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/commentCompose.ts
- src/page/modules/commentThreads.ts
- src/session/features/comments.ts
tested_in_files:
- test/core/comments/commentEditing.test.ts
- test/page/modules/commentCompose.test.ts
- test/page/modules/commentThreads.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-REVIEW-081
---

## A comment editor sends its text on Save or Cmd+Enter and keeps it until the host accepts it

### Normative behavior

When a reader writes a comment in the comment box or a reply in the reply box of a thread popover, the page SHALL send the typed text to the host only on Save or Reply, Cmd+Enter or Ctrl+Enter with a text that is not blank, and keep the box and its text until the host answers that the text is saved.

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
| An open box with no text and the reader presses Escape, wherever the focus is | The box closes and nothing is sent |
| An open box with typed text and the reader presses Escape | The box asks Discard or Keep editing and nothing is sent (SwRS-MDOKFSTUDIO-REVIEW-218) |
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

### Scenario (nominal): Reply box: the popover of a preview ends with the reply box

- GIVEN a preview and a thread
- WHEN its popover opens
- THEN the popover ends with the text area (aria-label "Reply to this thread", placeholder Reply, maxlength 10000) and the Reply button

### Scenario (refusal): Reply box: none without a reply hook

- GIVEN a page whose host gave no reply hook (the runtime context carries commentsEnabled false, as in a test host)
- WHEN the popover opens
- THEN no reply box is shown

### Scenario (nominal): Reply box: Reply sends the thread id and the trimmed text

- GIVEN a reply box holding "  Thanks  "
- WHEN the reader presses Reply, or presses Cmd+Enter or Ctrl+Enter in the box
- THEN one reply message with the thread id and the text Thanks is sent to the host

- GIVEN a reply box that is empty or holds only blanks
- WHEN the reader presses Reply, or presses Cmd+Enter or Ctrl+Enter in the box
- THEN nothing is sent (the body must not be empty)

### Scenario (nominal): Reply box: keys typed in the box stay in the box

- GIVEN an open reply box
- WHEN the reader types a letter that is also a shortcut of the page
- THEN the letter goes to the text area, the key event is stopped (stopImmediatePropagation) and no other key handler of the page acts
- AND when the reader presses Cmd+Enter with text, the reply is sent and the event is stopped

### Scenario (boundary): Reply box: length of the reply

| Input | Outcome |
| --- | --- |
| a reply of 10 000 characters | the reply is sent |
| a text of 10 001 characters forced into the box | nothing is sent (the text area also carries maxlength 10000) |

### Scenario (nominal): Reply box: a reply accepted by the host empties the box

- GIVEN a reply waiting for the host
- WHEN the host answers ok true
- THEN the reply box is emptied of the text that was sent
- AND when the reader typed other text in the box after the reply was sent, the box keeps that new text (the box is cleared only when it still equals the sent text)

### Scenario (refusal): Reply box: a reply the host does not accept keeps its text

| Input | Outcome |
| --- | --- |
| the host answers ok false with a reason | the text stays, the reason is shown as text in an alert of at most 500 characters and Reply works again |
| the host answers ok false without a reason | the text stays and the alert reads "The reply was not saved." |
| the host gives no answer within 15 seconds | the text stays, the message reads "No answer from the editor. Your text is kept: try Reply again." and Reply works again |
| the host answers ok true after that timeout | the box is emptied |

### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-038: the Comment button and the keyboard shortcut open the box.
- SwRS-MDOKFSTUDIO-REVIEW-049: the anchor that the create message carries.
- SwRS-MDOKFSTUDIO-REVIEW-054: the host writes the comment and refuses it with the reasons shown here.
- SwRS-MDOKFSTUDIO-REVIEW-217: where the box sits and how it follows its text.
- SwRS-MDOKFSTUDIO-REVIEW-218: Escape and a press outside, and the Discard question.

### Verification notes

- Method: test/page/modules/commentCompose.test.ts, unit tests `T43: typing in the box is not seen by other key handlers, and the box text is data` (Box content, Keys typed in the box stay in the box), `T43: Escape cancels the box, Cmd/Ctrl+Enter saves, an empty body posts nothing` (Save or Cmd/Ctrl+Enter sends the comment, Empty or blank text is not sent, Escape on a blank box closes it), `T43 r2: results of other kinds, or without a pending save, are ignored` (A saved comment closes the box), `T43 r2: a refused save keeps the box and the text, shows the reason as text and allows a retry` (A refused comment; the default text is not asserted), `T43 r2: no answer in time keeps the text, says so, and a late ok still closes the box` (No answer from the host).
- Method: real window review-annotations/r04-thread-created (Box content, Save sends the comment, A saved comment closes the box).
- Method: test/core/comments/commentEditing.test.ts, unit test `T43: normalizeBody trims and enforces 1 to 10000 characters` (the trimming and length rule of The host answers a blank or invalid comment as empty); the handler answers themselves are untested.
- Criteria: The dialog holds a textarea with maxlength 10000 and two buttons; the quote is set with textContent. Exactly one create message is posted per save and the post hook is not called for a trimmed empty body. stopImmediatePropagation is called for keydown inside the box only. The result handler returns true and closes only for a create answer while a save is pending. The error line has role alert and holds the reason cut at 500 characters. The no-answer message appears after ANSWER_TIMEOUT_MS = 15000 and a late answer closes the box. The placeholder and the length limit are not asserted. normalizeBody returns undefined for a blank body and the host answers with the reason, without a warning.
- Method: test/page/modules/commentThreads.test.ts, `T43: the popover has a reply box that posts the thread id and the trimmed body` (popover with a reply hook, Reply sends the trimmed text), `T43: no reply box without a reply hook (read-only previews)` (no hook), `T43: Cmd/Ctrl+Enter sends a reply and keys typed in the reply box stay there` (keyboard, keys stay in the box), `T43: a reply over 10000 characters is cut by the box and refused by the page` (length), `T43 r2: a refused reply keeps the text and shows the reason as text` (refusal with a reason; the default text "The reply was not saved." is not asserted), `T43 r2: no answer keeps the text, says so, and a late ok still empties the box` (timeout and late ok true).
- Method: real window review-annotations/r05-thread-reply (reply sent, immediate ok true empties the box).
- The text typed since the reply was sent is untested.
- Criteria: The reply box exists only when the reply hook is installed; one reply message is posted with the trimmed body; the textarea value is unchanged after a refusal and empty after ok true; the message appears after 15000 ms.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-003](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-003.md): A reviewer comments, replies, resolves and deletes, and no comment is lost
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-005](../trust-security/SwRS-MDOKFSTUDIO-TRUST-005.md): The host handles the write requests of every preview, whatever the trust
  - [SwRS-MDOKFSTUDIO-TRUST-090](../trust-security/SwRS-MDOKFSTUDIO-TRUST-090.md): Every page request is answered once by its id and result type, or ends with a readable error
  - [SwRS-MDOKFSTUDIO-TRUST-001](../trust-security/SwRS-MDOKFSTUDIO-TRUST-001.md): A document is editable whatever the trust; only its reads are restricted
  - [SwRS-MDOKFSTUDIO-BLOCK-041](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-041.md): One edit at a time: an open editor blocks other edits, opens and refreshes
- Supersedes:
  - [SwRS-MDOKFSTUDIO-REVIEW-081](SwRS-MDOKFSTUDIO-REVIEW-081.md): The thread popover of a preview sends a reply and keeps it until accepted
<!-- okf:links:end -->
