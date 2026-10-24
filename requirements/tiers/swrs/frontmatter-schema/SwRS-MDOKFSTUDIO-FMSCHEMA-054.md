---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-054
uuid: d30b7546-80db-48c4-932f-a3f3cf0a6b16
title: Bundle and project targets cannot leave their root
description: When a bundle-relative or project-relative target resolves outside
  its root, also through a symbolic link, the extension SHALL refuse it with the
  E10 error "escapes its {resolution} root".
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-015
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Bundle and project targets cannot leave their root

### Normative behavior

When a bundle-relative or project-relative target resolves outside its root, also through a symbolic link, the extension SHALL refuse it with the E10 error "escapes its {resolution} root".

### Scenario: Parent traversal

- GIVEN a bundle-relative value ../outside.md
- WHEN the document is analysed
- THEN the field carries [E10] target '../outside.md' escapes its bundle-relative root at 'ref' and the label reads Outside the allowed folder

### Scenario: Symbolic link out

- GIVEN a file inside the root that is a symbolic link to a file outside it
- WHEN the document is analysed
- THEN the link is refused with the same kind of error

### Verification notes

- Method: Unit test of the link resolver.
- Criteria: The check is made on the path and on the real path.
