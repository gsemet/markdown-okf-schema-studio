---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-038
uuid: 734d6828-a1f1-4433-9f55-b1d5aa598a1c
title: Without a schema, an added field follows the row whose menu was used
description: When a writer adds a field to a document without a schema, the
  extension SHALL insert it after the row whose menu was used, else at the end
  of the block.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-005
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-037; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMEDIT-037
---

## Without a schema, an added field follows the row whose menu was used

### Normative behavior

When a writer adds a field to a document without a schema, the extension SHALL insert it after the row whose menu was used, else at the end of the block.

### Scenario: Nominal

- GIVEN a document without a schema with the fields title and status
- WHEN owner is added from the menu of title
- THEN owner is inserted directly after title

### Scenario: Boundary or refusal

- GIVEN an afterField naming a field that does not exist
- WHEN owner is added
- THEN owner is appended at the end of the block

### Verification notes

- Method: Unit test on the frontmatter patch (test/core/frontmatter/okfFrontmatter.test.ts).
- Criteria: Test frontmatter add with afterField reports whether the field was placed.
