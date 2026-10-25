---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-022
uuid: 8f754170-7123-4b05-8527-ed0d527544cd
title: Schema lookup is off in Restricted Mode and for standalone files
description: 'When the workspace is not trusted or the document is not inside a workspace
  folder, the extension SHALL not look up a schema for the document.'
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-006
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-019; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMSCHEMA-019
---

## Schema lookup is off in Restricted Mode and for standalone files

### Normative behavior

When the workspace is not trusted or the document is not inside a workspace folder, the extension SHALL not look up a schema for the document.

### Scenario: Restricted Mode

- GIVEN a schema exists for the type and the workspace is in Restricted Mode
- WHEN the preview is rendered
- THEN no schema is looked up and no field is editable

### Scenario: Standalone file

- GIVEN a Markdown file opened outside every workspace folder with a typed frontmatter
- WHEN the preview is rendered
- THEN no schema is read

### Verification notes

- Method: Unit test of the analysis with schema resolution off; integration test.
- Criteria: The generic table shown in that case is specified in SwRS-MDOKFSTUDIO-FMSCHEMA-088. Schema resolution is off when the preview is read-only (no workspace folder, or an untrusted workspace).
- Known issue: a file outside every workspace folder in a trusted workspace is also told that schema validation requires a trusted workspace, which is misleading.
- Known issue: the untrusted integration suite does not assert the info row.
