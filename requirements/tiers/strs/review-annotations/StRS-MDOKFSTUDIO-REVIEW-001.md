---
type: StRS
id: StRS-MDOKFSTUDIO-REVIEW-001
uuid: 3feae4eb-bda5-4d73-8e9f-3d6a46cae5fe
title: A reviewer reads review threads on the text, and unplaceable ones are
  kept
description: When a document has a review comments file next to it, the Studio
  SHALL highlight the quoted text of each thread in the preview, open the thread
  when the reviewer selects the highlight, and list a thread whose text can no
  longer be found with confidence among the orphaned comments, keeping it in the
  file.
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
user_need: As a reviewer, I see where each discussion sits in the document and
  read it where it applies, I prefer a thread listed as orphaned over a thread
  attached to the wrong text, and I trust that a damaged comments file is never
  shown half and never lost by a later comment.
derived_by:
- SwRS-MDOKFSTUDIO-REVIEW-001
- SwRS-MDOKFSTUDIO-REVIEW-004
- SwRS-MDOKFSTUDIO-REVIEW-012
- SwRS-MDOKFSTUDIO-REVIEW-017
- SwRS-MDOKFSTUDIO-REVIEW-021
- SwRS-MDOKFSTUDIO-REVIEW-028
- SwRS-MDOKFSTUDIO-REVIEW-100
- SwRS-MDOKFSTUDIO-REVIEW-101
- SwRS-MDOKFSTUDIO-REVIEW-107
- SwRS-MDOKFSTUDIO-REVIEW-119
- SwRS-MDOKFSTUDIO-TRUST-001
default_owner_email: gaetan@xeberon.net
---

## A reviewer reads review threads on the text, and unplaceable ones are kept

### Normative behavior

When a document has a review comments file next to it, the Studio SHALL highlight the quoted text of each thread in the preview, open the thread when the reviewer selects the highlight, and list a thread whose text can no longer be found with confidence among the orphaned comments, keeping it in the file.

### Preserved stakeholder intent

As a reviewer, I see where each discussion sits in the document and read it where it applies, I prefer a thread listed as orphaned over a thread attached to the wrong text, and I trust that a damaged comments file is never shown half and never lost by a later comment.

### Rationale and constraints

- The threads live in a file named after the document, next to it; a resolved thread is shown dimmed.
- A thread whose text cannot be shown in the page stays reachable through a badge or the orphaned comments box.
- An orphaned thread keeps its stored lines and is never deleted by the Studio.
- When the review comments file of a document is not valid, the Studio shows none of its threads, warns the reviewer once and leaves the file untouched.
- A file that is too large, not JSON, of another version or with one bad thread counts as not valid.
- Writing a new comment is refused while the file is not valid.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-REVIEW-001](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-001.md): The review comments file next to a document holds its threads as data
  - [SwRS-MDOKFSTUDIO-REVIEW-004](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-004.md): A review comments file with any problem or over its limits is ignored with one warning
  - [SwRS-MDOKFSTUDIO-REVIEW-012](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-012.md): The host posts the threads of the review comments file and follows its changes
  - [SwRS-MDOKFSTUDIO-REVIEW-017](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-017.md): The quote of a thread is highlighted once in its block
  - [SwRS-MDOKFSTUDIO-REVIEW-021](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-021.md): A highlight, badge or orphan entry opens the thread popover
  - [SwRS-MDOKFSTUDIO-REVIEW-028](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-028.md): Threads that cannot be placed are listed in the Orphaned comments box
  - [SwRS-MDOKFSTUDIO-REVIEW-100](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-100.md): A thread follows its quote in the plain text, narrowed by its context
  - [SwRS-MDOKFSTUDIO-REVIEW-101](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-101.md): A thread whose quote is gone or ambiguous is orphaned and keeps its lines
  - [SwRS-MDOKFSTUDIO-REVIEW-107](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-107.md): A slightly changed quote is followed by a bounded fuzzy search
  - [SwRS-MDOKFSTUDIO-REVIEW-119](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-119.md): Moved thread lines are written with the document save only
  - [SwRS-MDOKFSTUDIO-TRUST-001](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-001.md): A read-only preview offers no editing affordance
<!-- okf:links:end -->
