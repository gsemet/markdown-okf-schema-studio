---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-052
uuid: 4aae45cb-71d2-4291-980d-0fe30e92364c
title: Project-relative links resolve from the project root
description: When a link annotation has the resolution `project-relative`, the
  extension SHALL resolve the target from the project root.
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

## Project-relative links resolve from the project root

### Normative behavior

When a link annotation has the resolution `project-relative`, the extension SHALL resolve the target from the project root.

### Scenario: Project root found

- GIVEN a project root and the value bundle/docs/t.md naming an existing file below it
- WHEN the document is analysed
- THEN the link is valid

### Scenario: No project root

- GIVEN no configured project root and no folder with a .git entry above the document inside a workspace folder
- WHEN the document is analysed
- THEN the field carries the warning [W15] ... project-relative root is unavailable

### Verification notes

- Method: Unit test of the link resolver.
- Criteria: The project root is the configured one, else the nearest git root inside a workspace folder.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMSCHEMA-014](../../strs/frontmatter-schema/StRS-MDOKFSTUDIO-FMSCHEMA-014.md): Frontmatter link fields resolve, show their status and can be followed
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-050](SwRS-MDOKFSTUDIO-FMSCHEMA-050.md): Links resolve from the document, bundle or project root and stay inside it
<!-- okf:links:end -->
