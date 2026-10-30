---
type: StRS
id: StRS-MDOKFSTUDIO-REVIEW-008
uuid: a6b5f604-90b3-45a7-b1a7-fe6a936a0f05
title: Review threads follow edits and renames of the document
description: When the text of a document changes or the document is renamed or
  moved, the Studio SHALL keep each review thread on the text it quotes and move
  the review comments file along with the document.
project: markdown-okf-schema-studio
scope: review-annotations
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: As a reviewer, I find a discussion on its text after the author
  edited the document around it, and I keep my comments when the author renames
  the document.
derived_by:
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-REVIEW-094
- SwRS-MDOKFSTUDIO-REVIEW-100
- SwRS-MDOKFSTUDIO-REVIEW-101
- SwRS-MDOKFSTUDIO-REVIEW-107
- SwRS-MDOKFSTUDIO-REVIEW-119
- SwRS-MDOKFSTUDIO-REVIEW-125
default_owner_email: gaetan@xeberon.net
---

## Review threads follow edits and renames of the document

### Normative behavior

When the text of a document changes or the document is renamed or moved, the Studio SHALL keep each review thread on the text it quotes and move the review comments file along with the document.

### Preserved stakeholder intent

As a reviewer, I find a discussion on its text after the author edited the document around it, and I keep my comments when the author renames the document.

### Rationale and constraints

- Threads follow typing at once in memory; the moved lines are written to the comments file when the document is saved.
- The comments file is never created by this follow-up.
- Nothing is overwritten on a rename: when a comments file already exists under the new name, the old one stays and a warning says so.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-BLOCK-041](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-041.md): One edit at a time: an open editor blocks other edits, opens and refreshes
  - [SwRS-MDOKFSTUDIO-REVIEW-094](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-094.md): Edits move the stored lines of a thread in memory
  - [SwRS-MDOKFSTUDIO-REVIEW-100](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-100.md): A thread follows its quote in the plain text, narrowed by its context
  - [SwRS-MDOKFSTUDIO-REVIEW-101](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-101.md): A thread whose quote is gone or ambiguous is orphaned and keeps its lines
  - [SwRS-MDOKFSTUDIO-REVIEW-107](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-107.md): A slightly changed quote is followed by a bounded fuzzy search
  - [SwRS-MDOKFSTUDIO-REVIEW-119](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-119.md): Moved thread lines are written with the document save only
  - [SwRS-MDOKFSTUDIO-REVIEW-125](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-125.md): A renamed document takes its review comments file along
<!-- okf:links:end -->
