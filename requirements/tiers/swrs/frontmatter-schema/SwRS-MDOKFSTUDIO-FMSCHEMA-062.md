---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-062
uuid: 702fe3ea-913c-45f3-970a-533c2b53bcda
title: The allowOutsideWorkspaceLinks setting default refuses outside links
description: When
  `markdownOkfSchemaStudio.frontmatter.allowOutsideWorkspaceLinks` is false, the
  extension SHALL refuse a document-relative link to a file outside every
  workspace folder with the E10 error "escapes its navigation root".
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-014
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-060; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMSCHEMA-060
default_owner_email: gaetan@xeberon.net
---

## The allowOutsideWorkspaceLinks setting default refuses outside links

### Normative behavior

When `markdownOkfSchemaStudio.frontmatter.allowOutsideWorkspaceLinks` is false, the extension SHALL refuse a document-relative link to a file outside every workspace folder with the E10 error "escapes its navigation root".

### Scenario: Setting off

- GIVEN a document-relative link ../../outside.md whose target is outside the workspace folder and the setting at its default false
- WHEN the document is analysed
- THEN the field carries [E10] target '../../outside.md' escapes its navigation root at 'ref' and the label reads Outside the allowed folder

### Scenario: Inside the workspace

- GIVEN a document-relative link to a file inside the workspace folder with the setting false
- WHEN the document is analysed
- THEN the link is valid

### Verification notes

- Method: Unit test of the link resolver.
- Criteria: Boolean, default false.
