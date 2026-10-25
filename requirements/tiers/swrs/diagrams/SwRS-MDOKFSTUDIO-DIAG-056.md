---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-056
uuid: 48ad57db-7274-4d0a-8260-c93a8acd69af
title: Includes resolve next to the including file
description: When the host resolves an include, it SHALL resolve a top-level
  include next to the previewed document and a nested include next to the
  including file.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-009
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-054; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-054
---

## Includes resolve next to the including file

### Normative behavior

When the host resolves an include, it SHALL resolve a top-level include next to the previewed document and a nested include next to the including file.

### Scenario: Nested include

- GIVEN an include request whose from is the absolute path of an included file in a sub folder
- WHEN the host resolves it
- THEN the name is resolved from that sub folder

### Scenario: Top-level include

- GIVEN an include request with from null
- WHEN the host resolves it
- THEN the name is resolved from the previewed document's folder

### Verification notes

- Method: Unit test: a top-level include resolves next to the document, a nested one next to the including file.
- Criteria: The base folder follows from.
