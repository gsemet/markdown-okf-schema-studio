---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-190
uuid: 1a45f0b5-eab0-4bdc-b2e7-4f57e8827ff1
title: An empty or too long reply is refused by the host
description: When the host receives a reply that is blank or longer than 10 000
  characters, or whose lines are not a thread, the extension SHALL answer "The
  reply could not be added to this thread." and change nothing.
project: markdown-okf-schema-studio
scope: review-annotations
req_lifecycle: deprecated
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-015
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
---

## An empty or too long reply is refused by the host

### Normative behavior

When the host receives a reply that is blank or longer than 10 000 characters, or whose lines are not a thread, the extension SHALL answer "The reply could not be added to this thread." and change nothing.

### Scenario: Blank reply

- GIVEN a reply of blanks that reached the host
- WHEN the host plans the edit
- THEN the answer is "The reply could not be added to this thread."

### Scenario: Non-thread lines

- GIVEN lines that are not a thread
- WHEN a reply is planned
- THEN the edit is refused

### Verification notes

- Method: Unit test `a reply cannot close the comment early, and an empty reply or a non-thread is refused` in test/core/comments/inlineThread.test.ts covers the planner; the host answer text is untested.
- Criteria: threadReplyEdit returns undefined and planThreadReply refuses with THREAD_REPLY_REFUSED.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-015](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-015.md): A writer keeps a discussion in the Markdown source and answers it from the preview
<!-- okf:links:end -->
