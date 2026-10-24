---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-058
uuid: 7e5f78b7-c00b-4ca1-aab7-03ce7f228403
title: "A missing include file is refused and watched"
description: "When an include names a file that does not exist inside the allowed
  folders, the host SHALL refuse it with the reason PlantUML file not found followed
  by the name and report the missing path for watching."
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

## A missing include file is refused and watched

### Normative behavior

When an include names a file that does not exist inside the allowed folders, the host SHALL refuse it with the reason PlantUML file not found followed by the name and report the missing path for watching.

### Scenario: Missing file

- GIVEN an include of a file that does not exist in the document's folder
- WHEN the host resolves it
- THEN it is refused with the not-found reason and the candidate path is reported for watching

### Scenario: Outside the folders

- GIVEN an include of a path outside the allowed folders
- WHEN the host resolves it
- THEN it is refused and no path is reported for watching

### Verification notes

- Method: Unit test: a missing file is refused and watched, a too large file and a symlink escape are refused (test/core/render/plantUmlIncludes.test.ts).
- Criteria: Only allowed-missing paths are watched.
