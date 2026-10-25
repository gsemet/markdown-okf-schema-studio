---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-019
uuid: b09c2ad8-d93a-4f2e-a428-6e8940ef4342
title: CRLF documents keep exact checkbox columns
description: When a document uses CRLF line endings, the extension SHALL give
  each checkbox the same line and column as in the LF document.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-003
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-GFM-016; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-GFM-016
---

## CRLF documents keep exact checkbox columns

### Normative behavior

When a document uses CRLF line endings, the extension SHALL give each checkbox the same line and column as in the LF document.

### Scenario: CRLF columns

- GIVEN a CRLF task list
- WHEN the preview is rendered
- THEN each checkbox column equals its marker column

### Scenario: Mixed endings

- GIVEN a document mixing LF and CRLF lines
- WHEN the preview is rendered
- THEN line numbers count each line break once

### Verification notes

- Method: Unit test on the render pipeline output.
- Criteria: Positions equal the source in CRLF.
