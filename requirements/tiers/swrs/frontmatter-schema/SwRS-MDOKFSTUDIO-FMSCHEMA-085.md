---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-085
uuid: 38248b58-0a6c-405e-8e7a-0cafe761e4c4
title: The badge counts infos only when there is no error or warning
description: When the frontmatter has info rows but no error and no warning, the
  extension SHALL show the count of infos in the title badge.
project: markdown-okf-schema-studio
scope: frontmatter-schema
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-010
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-039; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-039
default_owner_email: gaetan@xeberon.net
---

## The badge counts infos only when there is no error or warning

### Normative behavior

When the frontmatter has info rows but no error and no warning, the extension SHALL show the count of infos in the title badge.

### Scenario: Infos only

- GIVEN a document with only the no-schema info row
- WHEN the preview is rendered
- THEN the badge reads ℹ 1

### Scenario: Error and info

- GIVEN a document with an error and an info row
- WHEN the preview is rendered
- THEN the badge reads only the error count

### Verification notes

- Method: Unit test of the table renderer.
- Criteria: The info count is shown only when errors and warnings are both zero.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMSCHEMA-010](../../strs/frontmatter-schema/StRS-MDOKFSTUDIO-FMSCHEMA-010.md): Fields follow the schema and problems show on the field concerned
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-039](SwRS-MDOKFSTUDIO-FMSCHEMA-039.md): The title badge counts the issues and jumps to the first one
<!-- okf:links:end -->
