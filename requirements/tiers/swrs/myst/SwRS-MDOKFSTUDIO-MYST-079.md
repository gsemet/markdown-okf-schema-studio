---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-079
uuid: 4a7d1601-5d60-4a0d-bbb3-c577d7ab7c57
title: Problems entries are replaced and removed
description: When a document re-renders, its preview closes or its document
  changes, the extension SHALL replace or remove its Problems entries.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-007
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Problems entries are replaced and removed

### Normative behavior

When a document re-renders, its preview closes or its document changes, the extension SHALL replace or remove its Problems entries.

### Scenario: Nominal

- GIVEN a new render with fewer warnings
- WHEN it completes
- THEN old entries are replaced

### Scenario: Boundary or refusal

- GIVEN the preview closes
- WHEN it closes
- THEN no entries remain

### Verification notes

- Method: test
- Criteria: No unit test of the controller.
