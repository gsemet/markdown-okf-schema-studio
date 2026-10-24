---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-079
uuid: 04d41908-7798-4e4a-9a4e-b77984c12071
title: The built-in engine is pinned to an exact version
description: When the extension is packaged, it SHALL depend on @plantuml/core
  at one exact version without a range.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-006
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The built-in engine is pinned to an exact version

### Normative behavior

When the extension is packaged, it SHALL depend on @plantuml/core at one exact version without a range.

### Scenario: Exact version

- GIVEN package.json
- WHEN the dependency is read
- THEN it is of the form major.minor.patch with no range prefix

### Scenario: Licence era

- GIVEN the pinned version
- WHEN it is compared with 1.2026.6
- THEN it is not older, because earlier versions are licensed under the GPL

### Known issues

- Known issue: An engine upgrade can change the drawing output; only the visual campaign would show it.

### Verification notes

- Method: Unit test: the built-in PlantUML engine ships pinned.
- Criteria: Exact version string, 1.2026.6 or later.
