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
req_lifecycle: proposed
status: stable
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
- SwRS-MDOKFSTUDIO-GFM-039
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

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-BLOCK-041](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-041.md): One edit at a time: an open editor blocks other edits, opens and refreshes
  - [SwRS-MDOKFSTUDIO-BLOCK-058](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-058.md): Every host source edit is one undo step, renders once and reports a failed apply
  - [SwRS-MDOKFSTUDIO-GFM-016](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-016.md): Task list markers render as checkboxes with their source position
  - [SwRS-MDOKFSTUDIO-GFM-017](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-017.md): Task-list checkboxes sit in the bullet gutter
  - [SwRS-MDOKFSTUDIO-GFM-018](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-018.md): Checkbox markers stay literal where they have another meaning
  - [SwRS-MDOKFSTUDIO-GFM-019](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-019.md): CRLF documents keep exact checkbox columns
  - [SwRS-MDOKFSTUDIO-GFM-020](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-020.md): The webview keeps checkbox inputs
  - [SwRS-MDOKFSTUDIO-GFM-021](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-021.md): Clicking a checkbox toggles one source character
  - [SwRS-MDOKFSTUDIO-GFM-022](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-022.md): A checkbox toggle is one undo step
  - [SwRS-MDOKFSTUDIO-GFM-023](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-023.md): A pending toggle blocks further clicks
  - [SwRS-MDOKFSTUDIO-GFM-024](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-024.md): A refused toggle reverts the checkbox with a reason
  - [SwRS-MDOKFSTUDIO-GFM-025](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-025.md): Checkbox clicks are refused during an open edit
  - [SwRS-MDOKFSTUDIO-GFM-026](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-026.md): Read-only previews disable checkboxes
  - [SwRS-MDOKFSTUDIO-GFM-027](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-027.md): The host validates checkbox toggle messages
  - [SwRS-MDOKFSTUDIO-GFM-028](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-028.md): Content patches clear pending toggles
  - [SwRS-MDOKFSTUDIO-GFM-039](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-039.md): Radio choice lists render as a radio group and a click moves the selection in the source
  - [SwRS-MDOKFSTUDIO-TRUST-005](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-005.md): The host refuses every write request of a read-only preview with a reason
<!-- okf:links:end -->
