---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-117
uuid: c2d7c3ce-8c04-4a82-907a-520c65fb5670
title: One failing JAR diagram does not affect the others
description: When one of several JAR diagrams fails, the extension SHALL still
  render the other diagrams.
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

## One failing JAR diagram does not affect the others

### Normative behavior

When one of several JAR diagrams fails, the extension SHALL still render the other diagrams.

### Scenario: One failure

- GIVEN one failing diagram among three
- WHEN the results are injected
- THEN the other two are pictures and the failing one shows its message

### Scenario: All fail

- GIVEN three failing diagrams
- WHEN the results are injected
- THEN each shows its own message

### Known issues

- Known issue: Untested.

### Verification notes

- Method: No test: to be added.
- Criteria: Document order is preserved and failures are isolated.
