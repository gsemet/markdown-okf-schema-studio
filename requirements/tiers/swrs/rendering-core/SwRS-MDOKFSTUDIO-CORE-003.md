---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-003
uuid: 0cedfdb5-fd8e-4ff9-a6c2-fbcd688d2a55
title: Map each block to its source line
description: When a document is rendered, the extension SHALL give every
  paragraph, heading, block quote, list, list item, code block, table, math
  block, thematic break and definition list a one-based source line.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Map each block to its source line

### Normative behavior

When a document is rendered, the extension SHALL give every paragraph, heading, block quote, list, list item, code block, table, math block, thematic break and definition list a one-based source line.

### Scenario: Nominal map each block to its source line

- GIVEN a document whose third line starts a paragraph
- WHEN it is rendered
- THEN that paragraph element carries source line 3

### Scenario: Boundary or refusal of map each block to its source line

- GIVEN a directive whose children have no position of their own
- WHEN it is rendered
- THEN each child carries the line of the directive

### Verification notes

- Method: test
- Criteria: Every mapped block element carries a one-based source line attribute.
