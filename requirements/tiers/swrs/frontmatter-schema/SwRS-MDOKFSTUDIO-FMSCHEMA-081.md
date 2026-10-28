---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-081
uuid: 84a1e293-7117-4632-abd3-035bd8e9cc6a
title: The allowOutsideWorkspaceLinks setting set to true allows outside links
description: When
  `markdownOkfSchemaStudio.frontmatter.allowOutsideWorkspaceLinks` is true, the
  extension SHALL resolve a document-relative link to a file outside every
  workspace folder and allow navigating to it.
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

## The allowOutsideWorkspaceLinks setting set to true allows outside links

### Normative behavior

When `markdownOkfSchemaStudio.frontmatter.allowOutsideWorkspaceLinks` is true, the extension SHALL resolve a document-relative link to a file outside every workspace folder and allow navigating to it.

### Scenario: Setting on

- GIVEN the link ../../outside.md whose target is outside the workspace folder and the setting true
- WHEN the document is analysed
- THEN the link is valid

### Scenario: Other resolutions

- GIVEN a bundle-relative link ../outside.md with the setting true
- WHEN the document is analysed
- THEN the link is still refused as escaping its bundle-relative root

### Verification notes

- Method: Unit test of the link resolver; navigation with the setting on is not tested end to end.
- Criteria: Only document-relative links are affected by the setting.
