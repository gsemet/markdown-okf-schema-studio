---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-031
uuid: 3a47b41c-c3d3-46d3-bc19-a5c619e7ffa1
title: Remove field is disabled for a schema-required field
description: When the field editor of a schema-required field is open, the
  extension SHALL disable the Remove field button with the tooltip "Required by
  the schema; it cannot be removed".
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-005
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-029; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMEDIT-029
default_owner_email: gaetan@xeberon.net
---

## Remove field is disabled for a schema-required field

### Normative behavior

When the field editor of a schema-required field is open, the extension SHALL disable the Remove field button with the tooltip "Required by the schema; it cannot be removed".

### Scenario: Nominal

- GIVEN a row marked required by the schema
- WHEN its editor opens
- THEN the Remove button is disabled and its title reads "Required by the schema; it cannot be removed"

### Scenario: Boundary or refusal

- GIVEN an optional row
- WHEN its editor opens
- THEN the Remove button is enabled

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterFields.test.ts).
- Criteria: Tests T24 Remove field is disabled with a tooltip on a required row.
