---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-021
uuid: f35e14fc-0a2f-46d5-99cb-9e9f19bad831
title: A highlight, badge or orphan entry opens the thread popover
description: When a reader clicks, or presses Enter or Space on, a thread
  highlight, a thread badge or an orphaned comments entry while comments are
  shown, the extension SHALL toggle the popover of that thread, which lists
  every comment as plain text and stays inside the pane.
project: markdown-okf-schema-studio
scope: review-annotations
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-001
- StRS-MDOKFSTUDIO-REVIEW-003
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-059
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/commentThreads.ts
tested_in_files:
- test/page/modules/commentThreads.test.ts
- test/page/modules/reviewReq.requirements.test.ts
- test/page/runtimeCommentsHidden.test.ts
default_owner_email: gaetan@xeberon.net
---

## A highlight, badge or orphan entry opens the thread popover

### Normative behavior

When a reader clicks, or presses Enter or Space on, a thread highlight, a thread badge or an orphaned comments entry while comments are shown, the extension SHALL toggle the popover of that thread, which lists every comment as plain text and stays inside the pane.

Exception: while comments are hidden (the Comments button off or the setting preview.showComments false), the marks are plain text and open no popover (SwRS-MDOKFSTUDIO-REVIEW-152).

### Scenario (nominal): Click toggles the popover of one thread

| Given | When | Then |
| --- | --- | --- |
| a highlighted quote | the reader clicks it | the popover opens, and the click edits no block and follows no link |
| the popover is open | the reader clicks the same highlight again | the popover closes |
| a popover open for one thread | the reader clicks the highlight of another thread | the popover of the second thread replaces the first |
| comments hidden (button off or setting false) | the reader clicks a former highlight | no popover opens and the click acts as on plain text (SwRS-MDOKFSTUDIO-REVIEW-152) |

### Scenario (nominal): Enter or Space on a focused target

| Input | Outcome |
| --- | --- |
| Enter on a focused highlight, badge or orphaned comments entry | the popover opens (or closes) and the key does nothing else |
| Space on a focused highlight, badge or orphaned comments entry | the popover opens (or closes) and the key does nothing else |
| any other key on a focused highlight | the popover state does not change |

### Scenario (nominal): The popover lists every comment as text

- GIVEN a thread with a first comment and a reply
- WHEN the popover opens
- THEN both entries appear in order, each with author, date in the local format and body
- GIVEN a comment body made of an HTML tag
- WHEN the popover opens
- THEN the tag is shown as text

### Scenario (nominal): The popover of a resolved thread shows a Resolved note

| Given | When | Then |
| --- | --- | --- |
| a resolved thread | the popover opens | a Resolved note appears and the popover carries the resolved attribute |
| an open thread | the popover opens | no Resolved note appears |

### Scenario (boundary): The popover stays inside the pane horizontally

| Input | Outcome |
| --- | --- |
| popover opened | its width is at most 360 px and its left edge is at least 8 px from the left edge of the pane |
| highlight close to the right edge of a pane at least 216 px wide | the left edge is moved so that the popover ends at least 8 px before the right edge |
| pane narrower than 376 px | the width is the pane width minus 16 px, never below 200 px |

### Scenario (refusal): Closing the popover

| Input | Outcome |
| --- | --- |
| Escape while a popover is open | the popover closes and the event is stopped from reaching other handlers |
| Escape with no popover open | the key reaches the other handlers |
| Escape on a popover that asks "Delete thread?", then the thread is opened again | the popover shows Resolve and Delete, not the question |
| click outside a popover that asks "Delete thread?" | the popover closes |

### Scenario (boundary): The threads are posted again while a popover is open

| Open state | Thread still posted | Thread no longer posted |
| --- | --- | --- |
| popover | the popover for the same thread is open on the new highlight, badge or entry | the popover is closed |
| reply box with the text "draft" | the reopened reply box shows "draft" | the popover and the draft are gone (thread deleted by another tool) |
| popover asking "Delete thread?" | the popover still asks the question with Yes and No | not applicable |
| a question for one thread, then another thread opened | no question is shown for the other thread | not applicable |

### Verification notes

- Method: test/page/modules/commentThreads.test.ts (`T42: the popover shows author, date and bodies as text, never as HTML` opens the popover and checks the text entries and the resolved attribute; `T42 r2: Escape stops propagation only when it closed a popover` checks the Escape rows; `T42 r2: an open popover survives a re-apply while its thread exists`, `T43 r2: a reply draft survives the threads being posted again while the thread exists` and `T44: the pending question survives the threads being posted again` check the kept rows; `T44: Escape closes the popover and forgets the question` checks the Escape on a question row); real window review-annotations/r02-review-thread-popover (opening); visual scenarios review-annotations/v17-review-thread-open-light-900 (comment list, position in a 900 px pane) and review-annotations/v18-review-thread-resolved-light-900 (Resolved note).
- Method: test/page/modules/commentThreads.test.ts (`comments hidden: a click, Enter or Space on a highlight, badge or orphan entry opens nothing and is not swallowed`) and test/page/runtimeCommentsHidden.test.ts (`comments shown: the same click opens the thread popover and reveals nothing`, and the hidden case) check the exception.
- Method: test/page/modules/reviewReq.requirements.test.ts (Enter and Space on a focused highlight or badge toggle its popover and another key does nothing; the popover is at most 360 px wide and stays 8 px inside the pane edges).
- Untested: the toggle and replacement as such, the absence of the Resolved note for an open thread, the Thread-no-longer-posted column (popover, reply draft), the question shown for another thread, and the click outside a question.
- Criteria: At most one popover element exists and it names the clicked thread. Each entry holds an author, a date and a body set with textContent. The note and the resolved attribute exist exactly for resolved threads. The keydown handler toggles the thread for Enter and Space only, and stops the event. Left is clamped between 8 px and the window width minus the popover width minus 8 px; width is min(360, max(200, window width - 16)); the vertical position is not specified. stopImmediatePropagation is called only when a popover was open. After apply the popover element names the same thread id, the new reply box value equals the old one, and confirming equals the open thread id; confirming is undefined after close().

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-001](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-001.md): A reviewer reads review threads on the text, and unplaceable ones are kept
  - [StRS-MDOKFSTUDIO-REVIEW-003](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-003.md): A reviewer comments, replies, resolves and deletes, and no comment is lost
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-059](../trust-security/SwRS-MDOKFSTUDIO-TRUST-059.md): The page accepts only registered host messages addressed to its render
<!-- okf:links:end -->
