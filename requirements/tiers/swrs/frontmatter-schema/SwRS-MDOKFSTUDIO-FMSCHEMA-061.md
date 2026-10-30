---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-061
uuid: 3c0b8643-507f-43b7-8dd7-58ba30f64ed1
title: The projectRoot setting sets the project root
description: When `markdownOkfSchemaStudio.frontmatter.projectRoot` is a
  non-empty string, the extension SHALL use that folder as the project root, a
  relative path being taken from the first workspace folder.
project: markdown-okf-schema-studio
scope: frontmatter-schema
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-014
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-060; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-060
default_owner_email: gaetan@xeberon.net
---

## The projectRoot setting sets the project root

### Normative behavior

When `markdownOkfSchemaStudio.frontmatter.projectRoot` is a non-empty string, the extension SHALL use that folder as the project root, a relative path being taken from the first workspace folder.

### Scenario: Configured root

- GIVEN projectRoot set to the workspace folder and a project-relative link bundle/docs/t.md
- WHEN the document is analysed
- THEN the link is valid

### Scenario: Root that does not exist

- GIVEN projectRoot set to a folder that does not exist
- WHEN the document is analysed
- THEN the field carries the warning ... project-relative root is unavailable, with no fall back to the git root

### Verification notes

- Method: Unit test of the root resolution.
- Criteria: Default empty string; the value is trimmed; an absolute path is used as it is; any non-folder value is treated as unavailable.
- Known issue: one value serves the whole workspace, so nested bundles cannot each have their own root, and the message does not name the root that was tried.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMSCHEMA-014](../../strs/frontmatter-schema/StRS-MDOKFSTUDIO-FMSCHEMA-014.md): Frontmatter link fields resolve, show their status and can be followed
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-060](SwRS-MDOKFSTUDIO-FMSCHEMA-060.md): The bundleRoot, projectRoot and allowOutsideWorkspaceLinks settings set the roots
<!-- okf:links:end -->
