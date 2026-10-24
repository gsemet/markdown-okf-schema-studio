---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-019
uuid: 5d364a81-a1b8-4bfe-a269-f3a22123bad5
title: Warn about a missing included file
description: When an include names a file that does not exist, the extension
  SHALL list a warning naming the request in the status region.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-002
- StRS-MDOKFSTUDIO-CORE-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Warn about a missing included file

### Normative behavior

When an include names a file that does not exist, the extension SHALL list a warning naming the request in the status region.

### Scenario: Nominal warn about a missing included file

- GIVEN an include of `missing.md`
- WHEN it is rendered
- THEN a warning for `missing.md` is listed in the status region

### Scenario: Boundary or refusal of warn about a missing included file

- GIVEN the file is created and the document re-rendered
- WHEN it is rendered
- THEN the warning disappears and the content is expanded

### Verification notes

- Method: test
- Criteria: The warning appears while the file is missing and not after.
