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
lifecycle: proposed
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
