---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-087
uuid: 15080d72-3ce5-4ae8-a9e2-5884f2b5dd88
title: A link problem counts in the badge
description: When a frontmatter link does not resolve, the extension SHALL count
  the problem on the field row and in the title badge, without blocking the
  saving of other fields.
project: markdown-okf-schema-studio
scope: frontmatter-schema
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-014
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-039; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-039
default_owner_email: gaetan@xeberon.net
---

## A link problem counts in the badge

### Normative behavior

When a frontmatter link does not resolve, the extension SHALL count the problem on the field row and in the title badge, without blocking the saving of other fields.

### Scenario: Not found

- GIVEN a link value nope.md
- WHEN the table is rendered
- THEN the field row carries the issue and the badge counts one error

### Scenario: Root unavailable

- GIVEN a bundle-relative link without a bundle root
- WHEN the table is rendered
- THEN the badge counts one warning

### Verification notes

- Method: Unit test of the table renderer; integration test.
- Criteria: Link issues carry the origin link, which the field editor ignores when saving.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMSCHEMA-014](../../strs/frontmatter-schema/StRS-MDOKFSTUDIO-FMSCHEMA-014.md): Frontmatter link fields resolve, show their status and can be followed
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-039](SwRS-MDOKFSTUDIO-FMSCHEMA-039.md): The title badge counts the issues and jumps to the first one
<!-- okf:links:end -->
