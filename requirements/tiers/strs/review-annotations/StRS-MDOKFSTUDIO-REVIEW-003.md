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
req_lifecycle: approved
status: stable
approved_by: gaetan@xeberon.net
approved_at: '2026-10-28T00:00:00Z'
verified:
  by: human:gaetan@xeberon.net
  at: '2026-10-28T00:00:00Z'
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

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-REVIEW-001](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-001.md): The review comments file next to a document holds its threads as data
  - [SwRS-MDOKFSTUDIO-REVIEW-002](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-002.md): Comment thread text stays readable on every theme
  - [SwRS-MDOKFSTUDIO-REVIEW-004](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-004.md): A review comments file with any problem or over its limits is ignored with one warning
  - [SwRS-MDOKFSTUDIO-REVIEW-012](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-012.md): The host posts the threads of the review comments file and follows its changes
  - [SwRS-MDOKFSTUDIO-REVIEW-021](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-021.md): A highlight, badge or orphan entry opens the thread popover
  - [SwRS-MDOKFSTUDIO-REVIEW-038](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-038.md): Selected body text offers a Comment button and a keyboard shortcut
  - [SwRS-MDOKFSTUDIO-REVIEW-044](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-044.md): The comment box sends a comment and keeps its text until the host accepts it
  - [SwRS-MDOKFSTUDIO-REVIEW-049](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-049.md): A new comment is anchored by its lines, quote and surroundings
  - [SwRS-MDOKFSTUDIO-REVIEW-054](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-054.md): The host writes comment changes one after another within the file limits
  - [SwRS-MDOKFSTUDIO-REVIEW-065](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-065.md): A comment carries the configured, Git or system author name
  - [SwRS-MDOKFSTUDIO-REVIEW-069](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-069.md): A comment create message needs a valid anchor and a bounded body
  - [SwRS-MDOKFSTUDIO-REVIEW-070](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-070.md): A comment reply message names a thread and carries a bounded body
  - [SwRS-MDOKFSTUDIO-REVIEW-071](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-071.md): Resolve and delete messages name a thread; resolve carries a flag
  - [SwRS-MDOKFSTUDIO-REVIEW-073](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-073.md): Comment messages are accepted for any revision of the document
  - [SwRS-MDOKFSTUDIO-REVIEW-074](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-074.md): Reply, resolve, reopen and delete change the named thread only
  - [SwRS-MDOKFSTUDIO-REVIEW-081](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-081.md): The thread popover of a writable preview sends a reply and keeps it until accepted
  - [SwRS-MDOKFSTUDIO-REVIEW-086](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-086.md): Resolve, Reopen and a confirmed Delete wait for the host, one action at a time
  - [SwRS-MDOKFSTUDIO-REVIEW-119](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-119.md): Moved thread lines are written with the document save only
  - [SwRS-MDOKFSTUDIO-REVIEW-143](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-143.md): A click or Enter on a chip toggles its comment box
  - [SwRS-MDOKFSTUDIO-REVIEW-186](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-186.md): The host appends a reply inside the thread comment under the author
<!-- okf:links:end -->
