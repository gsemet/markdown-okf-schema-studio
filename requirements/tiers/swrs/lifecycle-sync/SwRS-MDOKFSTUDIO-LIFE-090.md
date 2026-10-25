---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-090
uuid: 7543f123-de54-4f91-8bd0-61ddd976e04a
title: Nodes the page added itself are never kept
description: When the page replaces its content with a patch, it SHALL NOT keep
  text nodes or nodes that the page added itself and that have no recorded key.
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-005
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Nodes the page added itself are never kept

### Normative behavior

When the page replaces its content with a patch, it SHALL NOT keep text nodes or nodes that the page added itself and that have no recorded key.

### Scenario: Page-added node

- GIVEN a node the page inserted into the content, such as an insertion control
- WHEN the page replaces the content
- THEN it is removed and not paired with a new block (unit test test/page/modules/contentMorph.test.ts "PERF-05: nodes without a recorded key (text, nodes the page added) are never kept")

### Scenario: Text node

- GIVEN a text node between two blocks
- WHEN the page replaces the content
- THEN it is replaced

### Verification notes

- Method: Unit test test/page/modules/contentMorph.test.ts as named.
- Criteria: Only keyed block nodes survive the replacement.

### Archived

Folded into SwRS-MDOKFSTUDIO-LIFE-088.
