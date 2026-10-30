---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-017
uuid: fcec9fa1-4219-42b9-941a-9929935dc51f
title: Task-list checkboxes sit in the bullet gutter
description: When a list item starts with a checkbox marker, the extension SHALL
  mark the item and its list as task-list-item and contains-task-list so the
  checkbox replaces the bullet.
project: markdown-okf-schema-studio
scope: gfm
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-003
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-GFM-016; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-GFM-016
default_owner_email: gaetan@xeberon.net
---

## Task-list checkboxes sit in the bullet gutter

### Normative behavior

When a list item starts with a checkbox marker, the extension SHALL mark the item and its list as task-list-item and contains-task-list so the checkbox replaces the bullet.

### Scenario: Task list classes

- GIVEN '- [ ] a' and '- [x] b'
- WHEN the preview is rendered
- THEN items have task-list-item and the list has contains-task-list

### Scenario: Ordinary list

- GIVEN '- a' without a marker
- WHEN the preview is rendered
- THEN no task-list class is added

### Verification notes

- Method: Unit and integration test on DOM classes.
- Criteria: Class names present only for task lists.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-GFM-003](../../strs/gfm/StRS-MDOKFSTUDIO-GFM-003.md): A writer toggles task checkboxes from the preview
- Superseded by:
  - [SwRS-MDOKFSTUDIO-GFM-016](SwRS-MDOKFSTUDIO-GFM-016.md): Task list markers render as checkboxes with their source position
<!-- okf:links:end -->
