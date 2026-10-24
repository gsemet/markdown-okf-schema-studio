---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-023
uuid: ac97b84d-58bc-4029-bf6e-5d18fd4af7de
title: Schema files may be written in YAML, JSON or JSON5
description: When a schema file is written in YAML, JSON or JSON5, the extension
  SHALL load it, stripping line and block comments outside strings from JSON and
  JSON5 files.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-007
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Schema files may be written in YAML, JSON or JSON5

### Normative behavior

When a schema file is written in YAML, JSON or JSON5, the extension SHALL load it, stripping line and block comments outside strings from JSON and JSON5 files.

### Scenario: JSON5 with comments

- GIVEN a Note.schema.json5 file with a line comment, a block comment and one declared string property
- WHEN a document of type Note is analysed
- THEN the schema loads and the property is listed with its text type

### Scenario: Trailing comma

- GIVEN a Note.schema.json5 file with a trailing comma after the last property
- WHEN the document is analysed
- THEN the schema cannot be parsed and the warning row "Schema could not be parsed: {error}" is shown

### Verification notes

- Method: Unit test of the schema parser (json5 and json formats parse correctly). The trailing-comma scenario has no test.
- Criteria: Only comment stripping is supported: trailing commas, unquoted keys and single-quote conversions are not.
- Known issue: JSON5 support is minimal: trailing commas and unquoted keys fail as a schema that cannot be parsed.
