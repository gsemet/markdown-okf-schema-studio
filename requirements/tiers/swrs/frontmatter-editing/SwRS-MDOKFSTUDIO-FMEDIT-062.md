---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-062
uuid: 37bc7062-5293-4fe8-86b6-6e5f468188cf
title: Boundary navigation does not step into the properties table
description: When a writer presses ArrowUp at the start of the first body block
  editor, the extension SHALL NOT move the editor onto the properties table.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-008
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-BLOCK-079; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-BLOCK-079
---

## Boundary navigation does not step into the properties table

### Normative behavior

When a writer presses ArrowUp at the start of the first body block editor, the extension SHALL NOT move the editor onto the properties table.

### Scenario: Nominal

- GIVEN a document with frontmatter and an open editor on the first body block
- WHEN the writer presses ArrowUp at the first line
- THEN no editor opens on the properties table

### Scenario: Boundary or refusal

- GIVEN a document with a block before the open one
- WHEN the writer presses ArrowUp at the first line
- THEN the previous block is the target

### Verification notes

- Method: Unit test ArrowUp at the start of the first body block does not step onto the properties table in test/page/fmtableReqFrontmatter.requirements.test.ts.
- Criteria: The table is skipped when walking mapped blocks.
