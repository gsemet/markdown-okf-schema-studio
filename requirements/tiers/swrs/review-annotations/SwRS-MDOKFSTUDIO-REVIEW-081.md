---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-081
uuid: 3758e9e7-4dc7-48fc-ac5b-56dce82793d8
title: The thread popover of a writable preview sends a reply and keeps it until
  accepted
description: When the popover of a review thread opens in a writable preview,
  the extension SHALL show a reply text area labelled "Reply to this thread" and
  a Reply button.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-003
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-001
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-090
- SwRS-MDOKFSTUDIO-BLOCK-041
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/commentThreads.ts
tested_in_files:
- test/page/modules/commentThreads.test.ts
---

## The thread popover of a writable preview sends a reply and keeps it until accepted

### Normative behavior

When the popover of a review thread opens in a writable preview, the extension SHALL show a reply text area labelled "Reply to this thread" and a Reply button.

### Scenario (nominal): The popover of a writable preview ends with the reply box

- GIVEN a writable preview and a thread
- WHEN its popover opens
- THEN the popover ends with the text area (aria-label "Reply to this thread", placeholder Reply, maxlength 10000) and the Reply button

### Scenario (refusal): No reply box in a read-only preview

- GIVEN a preview that cannot edit (no reply hook)
- WHEN the popover opens
- THEN no reply box is shown

### Scenario (nominal): Reply sends the thread id and the trimmed text

- GIVEN a reply box holding "  Thanks  "
- WHEN the reader presses Reply, or presses Cmd+Enter or Ctrl+Enter in the box
- THEN one reply message with the thread id and the text Thanks is sent to the host

- GIVEN a reply box that is empty or holds only blanks
- WHEN the reader presses Reply, or presses Cmd+Enter or Ctrl+Enter in the box
- THEN nothing is sent (the body must not be empty)

### Scenario (nominal): Keys typed in the reply box stay in the box

- GIVEN an open reply box
- WHEN the reader types a letter that is also a shortcut of the page
- THEN the letter goes to the text area, the key event is stopped (stopImmediatePropagation) and no other key handler of the page acts
- AND when the reader presses Cmd+Enter with text, the reply is sent and the event is stopped

### Scenario (boundary): Length of the reply

| Input | Outcome |
| --- | --- |
| a reply of 10 000 characters | the reply is sent |
| a text of 10 001 characters forced into the box | nothing is sent (the text area also carries maxlength 10000) |

### Scenario (nominal): A reply accepted by the host empties the box

- GIVEN a reply waiting for the host
- WHEN the host answers ok true
- THEN the reply box is emptied of the text that was sent
- AND when the reader typed other text in the box after the reply was sent, the box keeps that new text (the box is cleared only when it still equals the sent text)

### Scenario (refusal): A reply the host does not accept keeps its text

| Input | Outcome |
| --- | --- |
| the host answers ok false with a reason | the text stays, the reason is shown as text in an alert of at most 500 characters and Reply works again |
| the host answers ok false without a reason | the text stays and the alert reads "The reply was not saved." |
| the host gives no answer within 15 seconds | the text stays, the message reads "No answer from the editor. Your text is kept: try Reply again." and Reply works again |
| the host answers ok true after that timeout | the box is emptied |

### Related requirements

- SwRS-MDOKFSTUDIO-TRUST-001: a read-only preview shows no reply box
- SwRS-MDOKFSTUDIO-TRUST-005: the host refuses a thread write of a read-only preview with a reason
- SwRS-MDOKFSTUDIO-TRUST-090: the answer of the host is matched by its id and result type, or ends with a readable error
- SwRS-MDOKFSTUDIO-BLOCK-041: an open editor blocks the reply

### Verification notes

- Method: test/page/modules/commentThreads.test.ts, `T43: the popover has a reply box that posts the thread id and the trimmed body` (writable popover, Reply sends the trimmed text), `T43: no reply box without a reply hook (read-only previews)` (read-only), `T43: Cmd/Ctrl+Enter sends a reply and keys typed in the reply box stay there` (keyboard, keys stay in the box), `T43: a reply over 10000 characters is cut by the box and refused by the page` (length), `T43 r2: a refused reply keeps the text and shows the reason as text` (refusal with a reason; the default text "The reply was not saved." is not asserted), `T43 r2: no answer keeps the text, says so, and a late ok still empties the box` (timeout and late ok true).
- Method: real window review-annotations/r05-thread-reply (reply sent, immediate ok true empties the box).
- The text typed since the reply was sent is untested.
- Criteria: The reply box exists only when the reply hook is installed; one reply message is posted with the trimmed body; the textarea value is unchanged after a refusal and empty after ok true; the message appears after 15000 ms.
