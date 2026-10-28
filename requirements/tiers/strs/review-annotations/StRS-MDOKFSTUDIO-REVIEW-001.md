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
lifecycle: approved
approved_by: gaetan@xeberon.net
approved_on: 2026-10-28
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
