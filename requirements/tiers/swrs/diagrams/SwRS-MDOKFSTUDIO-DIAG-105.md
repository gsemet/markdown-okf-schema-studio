---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-105
uuid: e1a45a25-7904-44bd-9d76-e7de85bbf489
title: "JAR results are matched to diagrams in document order"
description: "When the JAR pipeline has several results, the extension SHALL match
  each result to its diagram in document order with the diagram's source line."
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-012
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## JAR results are matched to diagrams in document order

### Normative behavior

When the JAR pipeline has several results, the extension SHALL match each result to its diagram in document order with the diagram's source line.

### Scenario: Order

- GIVEN three diagrams that finish in another order
- WHEN the results are collected
- THEN result i belongs to diagram i and carries its source line

### Scenario: Single diagram

- GIVEN one diagram
- WHEN the result is collected
- THEN it is matched to that diagram with its line

### Known issues

- Known issue: Untested.

### Verification notes

- Method: No test: to be added.
- Criteria: Document order is preserved and failures are isolated.
