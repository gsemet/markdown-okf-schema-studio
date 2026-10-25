---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-047
uuid: 2176a01d-67d2-429a-b96e-b6f614ceae2a
title: A successful rename reports the remaining uses
description: When a rename succeeds, the extension SHALL show Renamed. N use(s)
  of old remain in this document, counting `{ref}` forms only, or Renamed. No
  use of the old name remains.
project: markdown-okf-schema-studio
scope: myst
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-009
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-038; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-MYST-038
---

## A successful rename reports the remaining uses

### Normative behavior

When a rename succeeds, the extension SHALL show Renamed. N use(s) of old remain in this document, counting `{ref}` forms only, or Renamed. No use of the old name remains.

### Scenario: Nominal

- GIVEN two `{ref}` uses of the old name
- WHEN a rename succeeds
- THEN the field shows the remaining count 2

### Scenario: Boundary or refusal

- GIVEN no `{ref}` use, or `{doc}` and `{numref}` uses only
- WHEN a rename succeeds
- THEN the field shows No use of the old name remains

### Verification notes

- Method: Unit test "the result shows how many {ref} uses of the old name remain" in test/page/modules/labelRename.test.ts; Unit test "counts {ref} uses with and without a title, not other roles or names" in test/core/mapping/labelRename.test.ts
- Criteria: Message text and `{ref}`-only counting match.
