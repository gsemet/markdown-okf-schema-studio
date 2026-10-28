---
type: StRS
id: StRS-MDOKFSTUDIO-GFM-003
uuid: f7c2af3c-c6f3-4fd8-bd4f-f42a097d548d
title: A writer toggles task checkboxes from the preview
description: When a writer clicks a checkbox in the preview, the Studio SHALL
  change only that checkbox in the source as one undoable step, or refuse with a
  reason when the preview is stale or read-only.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: proposed
origin: native
tier: StRS
derives_from: []
user_need: As a writer or reviewer, I tick task checkboxes directly in the
  preview and the source changes by exactly that character.
derived_by:
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-BLOCK-058
- SwRS-MDOKFSTUDIO-GFM-016
- SwRS-MDOKFSTUDIO-GFM-017
- SwRS-MDOKFSTUDIO-GFM-018
- SwRS-MDOKFSTUDIO-GFM-019
- SwRS-MDOKFSTUDIO-GFM-020
- SwRS-MDOKFSTUDIO-GFM-021
- SwRS-MDOKFSTUDIO-GFM-022
- SwRS-MDOKFSTUDIO-GFM-023
- SwRS-MDOKFSTUDIO-GFM-024
- SwRS-MDOKFSTUDIO-GFM-025
- SwRS-MDOKFSTUDIO-GFM-026
- SwRS-MDOKFSTUDIO-GFM-027
- SwRS-MDOKFSTUDIO-GFM-028
- SwRS-MDOKFSTUDIO-TRUST-005
default_owner_email: gaetan@xeberon.net
---

## A writer toggles task checkboxes from the preview

### Normative behavior

When a writer clicks a checkbox in the preview, the Studio SHALL change only that checkbox in the source as one undoable step, or refuse with a reason when the preview is stale or read-only.

### Preserved stakeholder intent

Writers and reviewers expect to tick a task checkbox without opening an editor, and expect the source to stay otherwise untouched.

### Rationale and constraints

- A toggle is refused while an edit is open, when the preview is out of date, and in read-only previews; the box then returns to its previous state.
