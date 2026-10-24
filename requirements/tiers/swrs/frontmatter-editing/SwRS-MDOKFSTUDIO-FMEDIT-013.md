---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-013
uuid: 76e70963-8206-4350-aa41-4ae846f9e4e5
title: A plain click on a link value edits the field
description: When a writer plain-clicks a link inside a field value in edit
  mode, the extension SHALL open the field editor instead of following the link.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
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
