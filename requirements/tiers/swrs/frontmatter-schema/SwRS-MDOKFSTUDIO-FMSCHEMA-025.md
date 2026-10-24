---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-025
uuid: 2b30fc34-c8ef-4915-911f-98b5ed7293fa
title: A schema that cannot be parsed gives a warning row
description: 'When a JSON or JSON5 schema file cannot be read or parsed, the extension
  SHALL show the generic table with the warning row "Schema could not be parsed: {error}"
  and a warning badge.'
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-008
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A schema that cannot be parsed gives a warning row

### Normative behavior

When a JSON or JSON5 schema file cannot be read or parsed, the extension SHALL show the generic table with the warning row "Schema could not be parsed: {error}" and a warning badge.

### Scenario: Unparsable JSON schema

- GIVEN a Note.schema.json5 file that is not valid JSON after comments are stripped
- WHEN a document of type Note is analysed
- THEN the table is generic and one warning row starts with Schema could not be parsed:

### Scenario: YAML syntax error

- GIVEN a Note.schema.yaml file holding the line `type: [a`
- WHEN a document of type Note is analysed
- THEN no Schema could not be parsed row appears; the partly parsed content is used and here the validator rejects it with the Schema validation failed to run row

### Verification notes

- Method: No test today: no test contains the text "could not be parsed" or a schema that fails to parse.
- Criteria: The summary is 0 errors, 1 warning, 0 infos for a JSON or JSON5 failure; the fields are listed in source order without documentation.
- Known issue: a YAML syntax error is not reported: the parse errors of the YAML document are never checked, so the partly parsed schema is applied silently.
- Known issue: an empty YAML schema file parses to null and makes the analysis throw a TypeError instead of showing a row.
- Known issue: the parse-failure branch has no test.
