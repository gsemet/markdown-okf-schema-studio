---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-050
uuid: daa2f9cf-8cdb-4f0c-bdc8-4a8c1f5a7fa8
title: Rename is blocked while an editor is open in the page
description: When a block editor or the properties editor is open, the extension
  SHALL open the rename field disabled with Save or cancel the open edit before
  renaming a label and post nothing.
project: markdown-okf-schema-studio
scope: myst
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-009
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-BLOCK-041; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-BLOCK-041
default_owner_email: gaetan@xeberon.net
---

## Rename is blocked while an editor is open in the page

### Normative behavior

When a block editor or the properties editor is open, the extension SHALL open the rename field disabled with Save or cancel the open edit before renaming a label and post nothing.

### Scenario: Nominal

- GIVEN a block editor open
- WHEN the anchor icon is clicked
- THEN the field is disabled with the message and nothing is posted

### Scenario: Boundary or refusal

- GIVEN the properties editor open
- WHEN the anchor icon is clicked
- THEN the same behaviour

### Verification notes

- Method: Unit test "an open block editor blocks the rename" in test/page/modules/labelRename.test.ts
- Criteria: Frontmatter half is a gap in tests.
