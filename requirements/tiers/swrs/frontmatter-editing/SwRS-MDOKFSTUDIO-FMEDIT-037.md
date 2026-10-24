---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-037
uuid: d18a6c97-ad18-4ebc-b9ce-b4a5ae8a61a2
title: With a schema, an added field goes where its row will show
description: When a writer adds a field to a document with a schema, the
  extension SHALL insert it right after the present field that precedes it in
  schema order, or right before the next one when it comes first.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-006
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## With a schema, an added field goes where its row will show

### Normative behavior

When a writer adds a field to a document with a schema, the extension SHALL insert it right after the present field that precedes it in schema order, or right before the next one when it comes first.

Known issue: when the minimal insertion cannot be verified, the field is appended at the end of the block instead (positioned false).

### Scenario: Nominal

- GIVEN a schema listing title, owner, status and a document with title and status
- WHEN owner is added
- THEN owner is inserted between title and status whichever row was clicked

### Scenario: Boundary or refusal

- GIVEN a field that comes first in schema order and a leading comment in the block
- WHEN it is added
- THEN it is inserted after the leading comment lines, before the first key; a custom key goes after the last row

### Verification notes

- Method: Unit test on the placement (test/core/frontmatter/okfFrontmatter.test.ts T41 tests).
- Criteria: Tests T41 a schema field goes between its schema neighbours; skips absent neighbours; a custom key goes after the last row; beforeField on the first key inserts after leading comment lines.
