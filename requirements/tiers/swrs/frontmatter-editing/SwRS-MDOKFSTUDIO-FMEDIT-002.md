---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-002
uuid: 32ff2020-aa79-49ab-a7f2-317b229662ff
title: "A field editor does not open while another editor is open"
description: "When a field editor or a block editor is open, the extension SHALL NOT
  open another field editor."
project: markdown-okf-schema-studio
scope: frontmatter-editing
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-008
- StRS-MDOKFSTUDIO-FMEDIT-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-BLOCK-041; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-BLOCK-041
default_owner_email: gaetan@xeberon.net
---

## A field editor does not open while another editor is open

### Normative behavior

When a field editor or a block editor is open, the extension SHALL NOT open another field editor.

### Scenario: Nominal

- GIVEN the editor of the lifecycle field open in edit mode
- WHEN the writer clicks the value cell of another field
- THEN no second field editor opens and the first stays open

### Scenario: Boundary or refusal

- GIVEN a block editor open in edit mode
- WHEN the writer clicks the value cell of a field
- THEN no field editor opens

### Known issues

- Known issue: an editor left in an error state keeps blocking every other field until it is cancelled with Escape in that editor; clicking another field or the page background does not close it (clicking a block or a plus insert point does).

### Verification notes

- Method: Unit test an open field editor blocks the key editor and a second value editor; a block editor blocks the field editor in test/page/fmtableReqFrontmatter.requirements.test.ts.
- Criteria: openFrontmatterValueEditor and openFrontmatterKeyEditor return when activeBlockEdit or activeFrontmatterEdit is set.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMEDIT-008](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-008.md): Metadata edits keep the source intact, follow the schema and never lose text
  - [StRS-MDOKFSTUDIO-FMEDIT-001](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-001.md): A writer edits metadata values in place with fitting controls
- Superseded by:
  - [SwRS-MDOKFSTUDIO-BLOCK-041](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-041.md): One edit at a time: an open editor blocks other edits, opens and refreshes
<!-- okf:links:end -->
