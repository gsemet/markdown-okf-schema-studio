---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-061
uuid: 87a04206-e651-4f11-b561-261850d2bd5c
title: Includes nest at most 8 files deep
description: When a built-in diagram includes files nested more than 8 deep, the
  page SHALL refuse the ninth level with the reason that the file is nested
  deeper than 8 includes.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-009
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Includes nest at most 8 files deep

### Normative behavior

When a built-in diagram includes files nested more than 8 deep, the page SHALL refuse the ninth level with the reason that the file is nested deeper than 8 includes.

### Scenario: Ninth level

- GIVEN a chain of nine nested includes
- WHEN the diagram is drawn
- THEN the ninth file is refused with the nesting reason and the diagram shows it

### Scenario: Eighth level

- GIVEN a chain of eight nested includes
- WHEN the diagram is drawn
- THEN all eight files are read and the picture is drawn

### Verification notes

- Method: Unit test: includes nested deeper than 8 files are refused.
- Criteria: Depth 8 passes, depth 9 fails.
