---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-013
uuid: 76e70963-8206-4350-aa41-4ae846f9e4e5
title: A plain click on a link value edits the field
description: When a writer plain-clicks a link inside a field value in edit
  mode, the extension SHALL open the field editor instead of following the link.
project: markdown-okf-schema-studio
scope: frontmatter-editing
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-001; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMEDIT-001
default_owner_email: gaetan@xeberon.net
---

## A plain click on a link value edits the field

### Normative behavior

When a writer plain-clicks a link inside a field value in edit mode, the extension SHALL open the field editor instead of following the link.

### Scenario: Nominal

- GIVEN edit mode on and a field value that shows a link
- WHEN the writer clicks the link without a modifier
- THEN the field editor opens and no navigation happens

### Scenario: Boundary or refusal

- GIVEN the same link
- WHEN the writer clicks with Cmd or Ctrl, or the page is in reading mode
- THEN the link is followed

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterFields.test.ts).
- Criteria: Tests T21 click on an okf link in edit mode, Cmd or Ctrl click, reading mode.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMEDIT-001](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-001.md): A writer edits metadata values in place with fitting controls
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMEDIT-001](SwRS-MDOKFSTUDIO-FMEDIT-001.md): A click on a field in edit mode opens its editor in place
<!-- okf:links:end -->
