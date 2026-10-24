---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-054
uuid: cb71b3a8-386b-4cc1-abfb-4d8ae1f59635
title: Malformed frontmatter save messages are ignored
description: When a previewFrontmatterSave message is malformed, the extension
  SHALL ignore it without a reply.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-009
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Malformed frontmatter save messages are ignored

### Normative behavior

When a previewFrontmatterSave message is malformed, the extension SHALL ignore it without a reply.

### Scenario: Nominal

- GIVEN a save without editId or fieldName, or with fieldValueFormat other than yaml
- WHEN the host receives it
- THEN nothing is replied and the document is unchanged

### Scenario: Boundary or refusal

- GIVEN an add whose afterField contains a line break, or a remove with afterField
- WHEN the host receives it
- THEN it is dropped and the document is unchanged

### Verification notes

- Method: Unit test on the message validators (test/core/protocol/pageStateMessages.test.ts).
- Criteria: Valid: non-empty editId and fieldName, fieldValue unless removing, fieldValueStyle plain only on a plain value save, afterField of 1 to 1024 characters without line breaks only with an add, frontmatterAction add or remove.
