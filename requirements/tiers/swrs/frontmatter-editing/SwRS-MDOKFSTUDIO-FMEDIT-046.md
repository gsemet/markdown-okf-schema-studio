---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-046
uuid: 89cc716d-9e32-499c-b215-15a0fa50daa3
title: Values ending in three dots or dashes stay inside the block
description: When a field value ends in ... or ---, the extension SHALL keep it
  inside the frontmatter block when editing another field.
project: markdown-okf-schema-studio
scope: frontmatter-editing
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-008
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-043; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMEDIT-043
default_owner_email: gaetan@xeberon.net
---

## Values ending in three dots or dashes stay inside the block

### Normative behavior

When a field value ends in ... or ---, the extension SHALL keep it inside the frontmatter block when editing another field.

### Scenario: Nominal

- GIVEN a block with title: To be continued... and status: draft
- WHEN status is changed
- THEN exactly the status line changes and the block keeps its three keys

### Scenario: Boundary or refusal

- GIVEN a block closed by a line of three dots
- WHEN a value is changed
- THEN the closing fence is kept and only the edited line changes

### Verification notes

- Method: Unit test on the frontmatter patch (test/core/frontmatter/frontmatterFence.test.ts).
- Criteria: Tests frontmatter fence fixtures: value ending in three dots, four dots, three dashes, dot-dot-dot closing fence.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMEDIT-008](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-008.md): Metadata edits keep the source intact, follow the schema and never lose text
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMEDIT-043](SwRS-MDOKFSTUDIO-FMEDIT-043.md): A frontmatter edit changes only the lines of its field
<!-- okf:links:end -->
