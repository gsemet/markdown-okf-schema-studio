---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-227
uuid: d1c7a24e-ee5b-4a3d-91b4-deae57669981
title: A thread reply or delete is refused while a block edit is open
description: When the host holds an open block edit and receives a reply to, or
  the deletion of, an inline thread, it SHALL answer "Save or cancel the open
  Markdown edit before changing a thread." and change nothing.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: deprecated
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-025
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
---

## A thread reply or delete is refused while a block edit is open

### Normative behavior

When the host holds an open block edit and receives a reply to, or the deletion of, an inline thread, it SHALL answer "Save or cancel the open Markdown edit before changing a thread." and change nothing.

### Scenario: Open edit

- GIVEN a held block edit
- WHEN previewThreadReply arrives
- THEN the answer is ok false with that reason

### Scenario: No open edit

- GIVEN no held edit
- WHEN the same message arrives
- THEN the reply is planned (see the review annotation behaviour)

### Verification notes

- Method: Untested here. The same guard for checkboxes is SwRS-MDOKFSTUDIO-GFM-025 and for the label rename SwRS-MDOKFSTUDIO-MYST-043 and SwRS-MDOKFSTUDIO-MYST-050; moves and clipboard keys are refused by the block moves and clipboard requirements above.
- Criteria: handleThreadChange checks edits.active before the thread lines.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-025](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-025.md): Preview edits land exactly, in one undo step, keep line endings, or are refused with a reason
<!-- okf:links:end -->
