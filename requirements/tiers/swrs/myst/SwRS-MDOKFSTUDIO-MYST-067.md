---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-067
uuid: 60e117d3-6c2e-4039-bf4b-43fe271c2a3f
title: A single conf-folder candidate governs when no ancestor conf exists
description: When no conf.py is found above a document, the extension SHALL use
  the single conf.py among docs/, doc/, sphinx/, source/ and docs/source/ at the
  workspace root, and none when two or more exist.
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

## A single conf-folder candidate governs when no ancestor conf exists

### Normative behavior

When no conf.py is found above a document, the extension SHALL use the single conf.py among docs/, doc/, sphinx/, source/ and docs/source/ at the workspace root, and none when two or more exist.

### Scenario: Nominal

- GIVEN only sphinx/conf.py
- WHEN a document at the root is checked
- THEN that file governs

### Scenario: Boundary or refusal

- GIVEN two candidate conf.py files, or an ancestor conf.py
- WHEN a document is checked
- THEN no conf governs in the first case and the ancestor wins in the second

### Verification notes

- Method: test
- Criteria: Decision D29.
