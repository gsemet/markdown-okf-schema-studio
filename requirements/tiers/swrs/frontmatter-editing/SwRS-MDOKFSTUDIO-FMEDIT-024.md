---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-024
uuid: 5a2d0d8a-cee8-48c2-9c10-f682d524a894
title: A click on a field name opens a key editor with unused schema keys
description: When a writer clicks a field name in edit mode, the extension SHALL
  open a key editor in the name cell whose suggestion list offers the schema
  keys not yet used.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-005
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A click on a field name opens a key editor with unused schema keys

### Normative behavior

When a writer clicks a field name in edit mode, the extension SHALL open a key editor in the name cell whose suggestion list offers the schema keys not yet used.

### Scenario: Nominal

- GIVEN edit mode on and a schema whose keys include owner, absent from the document
- WHEN the writer clicks the name cell of the title field
- THEN an input labelled "Frontmatter key title" opens with the caret at the end and its datalist offers owner

### Scenario: Boundary or refusal

- GIVEN a document without a schema
- WHEN the writer clicks a name cell
- THEN the key editor opens with an empty suggestion list

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterEditor.test.ts).
- Criteria: Tests frontmatter name cells open a schema-suggesting key editor and save on blur; visual scenario frontmatter-editing/v01-edit-key-suggestions-dark-900.
