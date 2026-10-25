---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-086
uuid: a2afd35e-acbc-4395-b689-d098cac85402
title: Resolve, Reopen and a confirmed Delete wait for the host, one action at a
  time
description: When a reader presses Resolve or Reopen in a thread popover, the
  extension SHALL send the new flag to the host, wait for its answer, and change
  the highlight only when the thread is posted again.
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

## Resolve, Reopen and a confirmed Delete wait for the host, one action at a time

### Normative behavior

When a reader presses Resolve or Reopen in a thread popover, the extension SHALL send the new flag to the host, wait for its answer, and change the highlight only when the thread is posted again.

### Scenario (nominal): Resolve and Reopen

- GIVEN an open thread
- WHEN the reader presses Resolve
- THEN a resolve message with true is sent and the highlight style changes after the thread is posted again, not before
- AND for a resolved thread the button reads Reopen, and pressing it sends a resolve message with false

### Scenario (nominal): Delete asks inside the popover

- GIVEN an open popover
- WHEN the reader presses Delete
- THEN the popover asks "Delete thread?" with Yes and No buttons, and no window.confirm call is made
- AND No removes the question and sends nothing
- AND Yes sends one delete message and the buttons wait for the host

### Scenario (refusal): A refused or unanswered resolve or delete

| Input | Outcome |
| --- | --- |
| a resolve waiting for the host, answered ok false with a reason | an alert shows the reason as text (cut at 500 characters) and Resolve works again |
| a resolve or a delete answered ok false without a reason | the alert reads "The change was not saved." |
| a resolve or a delete waiting for the host, no answer in 15 seconds | the alert reads "No answer from the editor. Nothing changed here: try again." and the reader can retry |
| a delete answered ok false with a reason | the thread stays, the reason is shown and the question is replaced by the Resolve and Delete buttons |
| a delete with no answer in 15 seconds | the question is replaced by the buttons and the alert reads "No answer from the editor. Nothing changed here: try again." |

### Scenario (boundary): One action at a time

| Input | Outcome |
| --- | --- |
| a reply waiting for the host | Resolve and Delete are disabled |
| a resolve waiting for the host | Reply is disabled |
| a delete waiting for the host | the other actions of the popover of that thread are disabled |

### Related requirements

- SwRS-MDOKFSTUDIO-TRUST-001: a read-only preview shows no Resolve or Delete button
- SwRS-MDOKFSTUDIO-TRUST-005: the host refuses a thread write of a read-only preview with a reason
- SwRS-MDOKFSTUDIO-TRUST-090: the answer of the host is matched by its id and result type, or ends with a readable error
- SwRS-MDOKFSTUDIO-BLOCK-041: an open editor blocks the change

### Verification notes

- Method: test/page/modules/commentThreads.test.ts, `T44: Resolve sends the flag, waits for ok, and the mark changes style after the re-post` (Resolve and Reopen), `T44: Delete asks inside the popover first; No cancels, Yes sends and waits for ok` (Delete confirmation), `T44: a refused resolve shows the reason as text in an alert and can be retried` (refused resolve; the no-answer text and the default text are not asserted), `T44: a refused delete keeps the thread, shows the reason and returns to the buttons` (refused delete; the no-answer case is not asserted), `T44 r2: a pending reply disables Resolve and Delete, and a pending resolve disables Reply` (one action at a time).
- Method: real window review-annotations/r06-thread-resolved (Resolve changes the highlight).
- Criteria: The button label follows the resolved flag and no style changes before the re-post; no window.confirm call and one delete message follows Yes; the alert holds the reason cut at 500 characters, or the timeout text; confirming is cleared after a refusal and after the timeout; the disabled attribute is set on the other controls while an action is pending.
