---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-008
uuid: 5a915238-f748-40fd-b42b-c4494c91bbbc
title: Treat diff lines as additions and deletions
description: When a `diff` or `patch` block is shown, the extension SHALL mark
  each line starting with `+` as an addition and each line starting with `-` as
  a deletion, keeping the literal markers.
project: markdown-okf-schema-studio
scope: code-blocks
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-002
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Treat diff lines as additions and deletions

### Normative behavior

When a `diff` or `patch` block is shown, the extension SHALL mark each line starting with `+` as an addition and each line starting with `-` as a deletion, keeping the literal markers.

### Scenario: nominal behavior

- GIVEN a `diff` block with one `+` line, one `-` line and one context line
- WHEN the preview renders it
- THEN the `+` line shows as an addition, the `-` line as a deletion and the context line is unmarked, all with their markers

### Scenario: boundary or refusal behavior

- GIVEN a `patch` block with an empty line and a line starting with a space
- WHEN the preview renders it
- THEN neither line is marked as an addition or deletion

### Verification notes

- Method: Unit tests and the diff visual scenarios.
- Criteria: Line classes match the first character and the markers stay in the text.
