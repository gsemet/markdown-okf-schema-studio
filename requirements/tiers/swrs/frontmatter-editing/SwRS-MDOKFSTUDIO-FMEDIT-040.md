---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-040
uuid: cd9c3de6-cece-4fc3-aefb-227fc94a1d32
title: The editor of an added field opens by itself once
description: When the table is re-rendered after an add, the extension SHALL
  open the editor of the new field once, also across the page reload that
  follows.
project: markdown-okf-schema-studio
scope: frontmatter-editing
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-005
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-037; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMEDIT-037
default_owner_email: gaetan@xeberon.net
---

## The editor of an added field opens by itself once

### Normative behavior

When the table is re-rendered after an add, the extension SHALL open the editor of the new field once, also across the page reload that follows.

### Scenario: Nominal

- GIVEN an add posted for the field owner in edit mode
- WHEN the re-rendered table arrives
- THEN the editor of owner opens and the pending edit is cleared when it closes

### Scenario: Boundary or refusal

- GIVEN the render that posted the add is loaded again, or a later render of an already opened editor
- WHEN the page loads
- THEN the first keeps the pending edit for the next render; the second does not reopen the editor

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterFields.test.ts).
- Criteria: Tests T25 a pending frontmatter edit opens the editor; a reload of the render that posted the add keeps it; a later render does not reopen it.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMEDIT-005](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-005.md): A writer adds, renames and removes metadata fields
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMEDIT-037](SwRS-MDOKFSTUDIO-FMEDIT-037.md): An added field is one inserted line where its row shows, and its editor opens
<!-- okf:links:end -->
