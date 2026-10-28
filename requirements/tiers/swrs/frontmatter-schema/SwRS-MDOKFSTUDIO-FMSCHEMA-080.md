---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-080
uuid: 21130d3a-0deb-4121-83e4-0aef02528e6e
title: The project root defaults to the nearest git root
description: When `markdownOkfSchemaStudio.frontmatter.projectRoot` is empty,
  the extension SHALL use the nearest folder with a `.git` entry above the
  document as the project root if it lies inside a workspace folder.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
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

## The project root defaults to the nearest git root

### Normative behavior

When `markdownOkfSchemaStudio.frontmatter.projectRoot` is empty, the extension SHALL use the nearest folder with a `.git` entry above the document as the project root if it lies inside a workspace folder.

### Scenario: Git root inside the workspace

- GIVEN projectRoot empty and a .git entry in a workspace folder above the document
- WHEN a project-relative link is analysed
- THEN the link resolves from the folder holding .git

### Scenario: Git root outside the workspace

- GIVEN projectRoot empty and the nearest .git above the workspace folders
- WHEN a project-relative link is analysed
- THEN the field carries the warning ... project-relative root is unavailable

### Verification notes

- Method: Unit test of the root resolution (auto-detected git roots outside the workspace are ignored).
- Criteria: Otherwise project-relative links show the warning W15 with the label Link root unavailable.
