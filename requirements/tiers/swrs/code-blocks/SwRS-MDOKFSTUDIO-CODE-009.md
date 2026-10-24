---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-009
uuid: 1f813e26-5d54-4ffa-a846-d1cbfb59682d
title: Colour diff file header lines like ordinary lines
description: When a diff contains `--- a/file` and `+++ b/file` header lines,
  the extension SHALL colour them as a deletion and an addition respectively.
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

## Colour diff file header lines like ordinary lines

### Normative behavior

When a diff contains `--- a/file` and `+++ b/file` header lines, the extension SHALL colour them as a deletion and an addition respectively.

### Scenario: nominal behavior

- GIVEN a diff with the `--- a/f` and `+++ b/f` headers
- WHEN the preview renders it
- THEN the `---` line is a deletion and the `+++` line is an addition

### Scenario: boundary or refusal behavior

- GIVEN a diff whose header line starts with `diff --git`
- WHEN the preview renders it
- THEN the line is unmarked

### Verification notes

- Method: Unit test counting classified lines.
- Criteria: Two deletion and two addition lines for a two-file diff.
