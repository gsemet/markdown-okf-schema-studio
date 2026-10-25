---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-077
uuid: 63ab51ef-ad12-4ed1-bb6f-ec6eafdc56a8
title: The no-lookup info row appears only for typed documents
description: When no schema is looked up because the workspace is not trusted or
  the document is outside every workspace folder, the extension SHALL show the
  info row "Schema validation requires a trusted workspace; showing generic
  frontmatter." if the frontmatter has a string `type`.
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

## The no-lookup info row appears only for typed documents

### Normative behavior

When no schema is looked up because the workspace is not trusted or the document is outside every workspace folder, the extension SHALL show the info row "Schema validation requires a trusted workspace; showing generic frontmatter." if the frontmatter has a string `type`.

### Scenario: Typed document

- GIVEN a document with `type: Note` in Restricted Mode
- WHEN the preview is rendered
- THEN the generic table shows the info row and an info badge

### Scenario: Untyped document

- GIVEN a document without a type in Restricted Mode
- WHEN the preview is rendered
- THEN no info row is shown

### Verification notes

- Method: Unit test of the analysis with schema resolution off; the untrusted integration suite does not assert the row.
- Criteria: The summary counts one info for a typed document.
- Known issue: a file outside every workspace folder in a trusted workspace gets the same message, which mentions a trusted workspace.
