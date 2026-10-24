---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-088
uuid: 45546dfa-d29d-4a6f-9a34-90a923969721
title: The generic table is shown when no schema lookup is made
description: When no schema lookup is made for the document, the extension SHALL
  show the generic frontmatter table.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-006
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The generic table is shown when no schema lookup is made

### Normative behavior

When no schema lookup is made for the document, the extension SHALL show the generic frontmatter table.

### Scenario: Restricted Mode

- GIVEN a schema exists for the type and the workspace is in Restricted Mode
- WHEN the preview is rendered
- THEN the table is generic and no field is editable

### Scenario: Standalone file

- GIVEN a Markdown file opened outside every workspace folder with a typed frontmatter
- WHEN the preview is rendered
- THEN the table is generic

### Verification notes

- Method: Unit test of the analysis with schema resolution off; integration test (the generic table only; no test asserts the info row in Restricted Mode).
- Criteria: The table lists the fields without schema, error or enum information; the lookup itself is specified in SwRS-MDOKFSTUDIO-FMSCHEMA-022.
- Known issue: a file outside every workspace folder in a trusted workspace is also told that schema validation requires a trusted workspace, which is misleading (see 022).
