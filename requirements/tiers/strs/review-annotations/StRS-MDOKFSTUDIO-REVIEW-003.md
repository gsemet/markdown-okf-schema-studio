---
type: StRS
id: StRS-MDOKFSTUDIO-REVIEW-003
uuid: 347cc625-ce06-44bf-a651-807bf80c9a9e
title: A reviewer comments, replies, resolves and deletes, and no comment is
  lost
description: When a reviewer selects text in the preview and saves a comment, or
  replies to, resolves, reopens or deletes a thread, the Studio SHALL save that
  change in the review comments file under the name of its author, keep every
  change saved in quick succession, and, when a change cannot be saved, keep the
  typed text on screen and tell the reviewer why.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: proposed
origin: native
tier: StRS
derives_from: []
user_need: As a reviewer, I attach a comment to the exact words I am talking
  about, answer a discussion and close it or remove it from the thread itself,
  see my name on my comments without extra work, and never lose a long comment
  because the file could not be written or because another one was saved at the
  same moment.
derived_by:
- SwRS-MDOKFSTUDIO-REVIEW-001
- SwRS-MDOKFSTUDIO-REVIEW-002
- SwRS-MDOKFSTUDIO-REVIEW-004
- SwRS-MDOKFSTUDIO-REVIEW-012
- SwRS-MDOKFSTUDIO-REVIEW-021
- SwRS-MDOKFSTUDIO-REVIEW-038
- SwRS-MDOKFSTUDIO-REVIEW-044
- SwRS-MDOKFSTUDIO-REVIEW-049
- SwRS-MDOKFSTUDIO-REVIEW-054
- SwRS-MDOKFSTUDIO-REVIEW-065
- SwRS-MDOKFSTUDIO-REVIEW-069
- SwRS-MDOKFSTUDIO-REVIEW-070
- SwRS-MDOKFSTUDIO-REVIEW-071
- SwRS-MDOKFSTUDIO-REVIEW-073
- SwRS-MDOKFSTUDIO-REVIEW-074
- SwRS-MDOKFSTUDIO-REVIEW-081
- SwRS-MDOKFSTUDIO-REVIEW-086
- SwRS-MDOKFSTUDIO-REVIEW-119
- SwRS-MDOKFSTUDIO-REVIEW-143
- SwRS-MDOKFSTUDIO-REVIEW-186
default_owner_email: gaetan@xeberon.net
---

## A reviewer comments, replies, resolves and deletes, and no comment is lost

### Normative behavior

When a reviewer selects text in the preview and saves a comment, or replies to, resolves, reopens or deletes a thread, the Studio SHALL save that change in the review comments file under the name of its author, keep every change saved in quick succession, and, when a change cannot be saved, keep the typed text on screen and tell the reviewer why.

### Preserved stakeholder intent

As a reviewer, I attach a comment to the exact words I am talking about, answer a discussion and close it or remove it from the thread itself, see my name on my comments without extra work, and never lose a long comment because the file could not be written or because another one was saved at the same moment.

### Rationale and constraints

- The comments file is created when it does not exist.
- Selections in code, diagrams, math, the properties table and open editors offer no comment.
- Deleting asks for confirmation inside the thread.
- Deleting the last thread keeps the comments file with an empty list.
- Reasons a change cannot be saved include a damaged comments file, a comments file with unsaved changes in an editor, a read-only preview and a document that is not saved yet.
- When the editor gives no answer in time, the text is kept and the reviewer can try again.
- Every change of the comments file reads the latest file first, so a change made by another tool in between is kept too.
- The author is the name the reviewer configured in a setting or, without one, the name known to Git or to the operating system; when no name can be found at all, the comment is stored as Anonymous.
