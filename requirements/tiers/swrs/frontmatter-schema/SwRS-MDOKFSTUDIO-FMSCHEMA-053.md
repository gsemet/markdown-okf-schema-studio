---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-053
uuid: 419b22ce-00a9-48b6-b195-2d79e67b43f0
title: Absolute link targets are refused
description: When a link target is an absolute path in POSIX, drive-letter or
  UNC form, the extension SHALL refuse it with an E10 error whatever the
  resolution.
project: markdown-okf-schema-studio
scope: frontmatter-schema
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-014
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-050; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-050
default_owner_email: gaetan@xeberon.net
---

## Absolute link targets are refused

### Normative behavior

When a link target is an absolute path in POSIX, drive-letter or UNC form, the extension SHALL refuse it with an E10 error whatever the resolution.

### Scenario: POSIX path

- GIVEN the value /etc/hosts
- WHEN the document is analysed
- THEN the field carries [E10] absolute target '/etc/hosts' is not allowed at 'ref' and the label reads Absolute paths are not allowed

### Scenario: Drive letter

- GIVEN the value C:/x.md
- WHEN the document is analysed
- THEN the same refusal is reported for the drive-letter path

### Verification notes

- Method: Unit test of the link resolver.
- Criteria: A target starting with two backslashes is refused as UNC.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMSCHEMA-014](../../strs/frontmatter-schema/StRS-MDOKFSTUDIO-FMSCHEMA-014.md): Frontmatter link fields resolve, show their status and can be followed
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-050](SwRS-MDOKFSTUDIO-FMSCHEMA-050.md): Links resolve from the document, bundle or project root and stay inside it
<!-- okf:links:end -->
