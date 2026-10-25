---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-020
uuid: f27fbf9d-0a08-45f9-ab27-40ea5bca862b
title: The schema file is chosen by the type name
description: When the schema folder holds files named `{type}.schema.yaml`,
  `.yml`, `.json` or `.json5`, the extension SHALL pick the file whose stem
  equals the type ignoring case, preferring `.yaml`, then `.yml`, `.json`,
  `.json5`.
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

## The schema file is chosen by the type name

### Normative behavior

When the schema folder holds files named `{type}.schema.yaml`, `.yml`, `.json` or `.json5`, the extension SHALL pick the file whose stem equals the type ignoring case, preferring `.yaml`, then `.yml`, `.json`, `.json5`.

### Scenario: Case-insensitive stem

- GIVEN a schema folder with Note.schema.yaml and a document of type note
- WHEN the document is analysed
- THEN Note.schema.yaml is used as the schema

### Scenario: Several extensions

- GIVEN a schema folder with note.schema.json, note.schema.yml and note.schema.yaml
- WHEN the document is analysed
- THEN note.schema.yaml is used and the other two files are ignored

### Verification notes

- Method: Unit test of the schema file matcher.
- Criteria: Both the stem and the `.schema` suffix are compared in lower case (Note.SCHEMA.YAML matches the type note); files that do not end in `.schema` plus an accepted extension never match.
