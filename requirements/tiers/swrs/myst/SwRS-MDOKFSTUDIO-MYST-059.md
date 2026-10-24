---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-059
uuid: eb1d4986-9c57-4fcd-9a06-ecf23b0f72b5
title: Toctree glob entries list matching documents sorted
description: When a toctree has `:glob:` entries with wildcards, the extension
  SHALL list the matching documents in sorted order.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-012
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Toctree glob entries list matching documents sorted

### Normative behavior

When a toctree has `:glob:` entries with wildcards, the extension SHALL list the matching documents in sorted order.

### Scenario: Nominal

- GIVEN `chapters/*` matching three files
- WHEN the preview renders
- THEN three links appear in sorted order

### Scenario: Boundary or refusal

- GIVEN a wildcard matching nothing
- WHEN the preview renders
- THEN it shows as a missing entry

### Verification notes

- Method: test
- Criteria: Scan limits are rendering-core's.
