---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-023
uuid: ac97b84d-58bc-4029-bf6e-5d18fd4af7de
title: Schemas in YAML, JSON or JSON5 with relative references compile or report
  a row
description: When a schema file is written in YAML, JSON or JSON5, the extension
  SHALL load it, stripping line and block comments outside strings from JSON and
  JSON5 files and inlining its relative `$ref` references to other files of the
  schema folder, and showing a row of the table for a schema it cannot parse or
  compile.
project: markdown-okf-schema-studio
scope: frontmatter-schema
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-006
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/frontmatter/frontmatterParse.ts
- src/core/frontmatter/okfFrontmatter.ts
tested_in_files:
- test/core/frontmatter/diagReq.frontmatter.requirements.test.ts
- test/core/frontmatter/okfFrontmatter.test.ts
- test/core/frontmatter/schemaRegistry.test.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-FMSCHEMA-024
- SwRS-MDOKFSTUDIO-FMSCHEMA-025
- SwRS-MDOKFSTUDIO-FMSCHEMA-026
---

## Schemas in YAML, JSON or JSON5 with relative references compile or report a row

### Normative behavior

When a schema file is written in YAML, JSON or JSON5, the extension SHALL load it, stripping line and block comments outside strings from JSON and JSON5 files and inlining its relative `$ref` references to other files of the schema folder, and showing a row of the table for a schema it cannot parse or compile.

### Scenario (nominal): JSON5 with comments

- GIVEN a Note.schema.json5 file with a line comment, a block comment and one declared string property
- WHEN a document of type Note is analysed
- THEN the schema loads and the property is listed with its text type

### Scenario (nominal): Extension fallback of a relative reference

- GIVEN a schema with allOf holding a node `$ref: base.schema` and a folder with base.schema.yml declaring an id string property
- WHEN the document is analysed
- THEN the resolved schema declares the id property and no $ref remains in it
- AND a node that is exactly a relative `$ref` is replaced by the content of the file, trying the name as written then `.json`, `.json5`, `.yaml` and `.yml`

### Scenario (boundary): Other forms of a relative reference

| Input | Outcome |
| --- | --- |
| two schema files that refer to each other | the first inlined copy is kept, the inner reference stays as a reference to the schema root and the analysis ends |
| `$ref: base.schema.yaml#defs` and a base.schema.yaml whose key defs holds a number schema | the node is replaced by the content of the defs key |
| two properties a and b that both refer to base.schema.yaml, which is not part of a cycle | a is replaced by the file content and b becomes a reference to the schema root |
| `$ref: nope.yaml` whose file does not exist | the node becomes a reference to the schema root (the fragment alone is kept when the reference has one) |

### Scenario (refusal): Standard JSON pointer fragment

- GIVEN a node `$ref: base.schema.yaml#/defs/s` for the same file
- WHEN the document is analysed
- THEN the property that holds the reference is left without a schema, the schema does not compile and the red row "Schema validation failed to run: schema is invalid: ..." is shown

### Scenario (refusal): Schema that cannot be parsed

| Input | Outcome |
| --- | --- |
| a Note.schema.json5 file that is not valid JSON after comments are stripped | the table is generic and one warning row starts with "Schema could not be parsed: {error}", with a warning badge |
| a Note.schema.json5 file with a trailing comma after the last property | the schema cannot be parsed and the warning row "Schema could not be parsed: {error}" is shown |

### Scenario (refusal): YAML syntax error

- GIVEN a Note.schema.yaml file holding the line `type: [a`
- WHEN a document of type Note is analysed
- THEN no "Schema could not be parsed" row appears; the partly parsed content is used and here the validator rejects it with the "Schema validation failed to run" row

### Scenario (boundary): Empty YAML schema

- GIVEN a Note.schema.yaml file that is empty or holds only comments
- WHEN a document of type Note is analysed
- THEN the type stays without schema: the table is generic, one informational row reads "schema file 'Note.schema.yaml' is empty" (the wording of okf-schema), the summary is 0 errors, 0 warnings, 1 info and the analysis does not throw

### Scenario (refusal): Schema that cannot be compiled

- GIVEN a schema declaring a property with `type: nonsense`
- WHEN a document of type Note is analysed
- THEN one red alert row reads "Schema validation failed to run: schema is invalid: ..." and the badge reads 1 error
- AND the declared fields are still listed in schema order, with their documentation

### Scenario (boundary): Compile failure in a narrow preview

- GIVEN the same table in a 460 px preview with the Description column hidden
- WHEN the preview is rendered
- THEN the row spans two columns and no text overflows

### Known issues

- Known issue: the reference cycle scenario has no test.
- Known issue: JSON5 support is minimal: trailing commas and unquoted keys fail as a schema that cannot be parsed.
- Known issue: a reference such as `../../x.yaml` is read even when it leaves the schema folder (only a trusted workspace reaches this code).
- Known issue: a file reference with a standard JSON-pointer fragment such as `base.schema.yaml#/defs/s` leaves the property that holds it without a schema (the pointer is split with an empty first segment, so the lookup returns undefined); the property stays listed, but Ajv refuses the whole schema ("schema is invalid: data/properties/a must be object,boolean"), the table shows the red row "Schema validation failed to run: ..." and every validation is lost; a fragment without the leading slash such as `base.schema.yaml#defs` selects the key.
- Known issue: the set of inlined files is shared by the whole resolution and never emptied, so a second reference to a file that is already inlined (no cycle) becomes a reference to the schema root and the field is validated against the whole schema.
- Known issue: a missing target becomes a reference to the schema root, not an unresolved reference.
- Known issue: a reference with a sibling keyword next to `$ref` is not inlined.
- Known issue: a YAML syntax error is not reported: the parse errors of the YAML document are never checked, so the partly parsed schema is applied silently.

### Verification notes

- Method: test/core/frontmatter/okfFrontmatter.test.ts (JSON5 with comments; extension fallback of a relative reference; the other reference forms were probed against the resolver and have no test; the trailing-comma scenario has no test; the reference cycle scenario has no test).
- Method: test/core/frontmatter/diagReq.frontmatter.requirements.test.ts, test `a JSON5 schema that cannot be parsed gives the generic table and one warning row; a YAML error is not reported as such` (schema that cannot be parsed, YAML syntax error).
- Method: test/core/frontmatter/diagReq.frontmatter.requirements.test.ts, test `an empty or comment-only YAML schema is reported as empty: generic table, one info note, no throw` (empty YAML schema).
- Method: test/core/frontmatter/schemaRegistry.test.ts (schema that cannot be compiled: the same error is reported at every analysis).
- Method: test/visual/scenarioDefinitions2.ts, visual scenario in dark and light, 900 px and 460 px (schema that cannot be compiled, compile failure in a narrow preview).
- Criteria: Only comment stripping is supported: trailing commas, unquoted keys and single-quote conversions are not. Only a node made of a single `$ref` key is inlined; a missing target leaves a reference to the schema root. The summary is 0 errors, 1 warning, 0 infos for a JSON or JSON5 failure, and the fields are listed in source order without documentation. The standard JSON-pointer scenario has no test (probed against the resolver).

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMSCHEMA-006](../../strs/frontmatter-schema/StRS-MDOKFSTUDIO-FMSCHEMA-006.md): A document finds its schema and schema problems are reported
- Supersedes:
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-024](SwRS-MDOKFSTUDIO-FMSCHEMA-024.md): Relative schema references are inlined from the schema folder
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-025](SwRS-MDOKFSTUDIO-FMSCHEMA-025.md): A schema that cannot be parsed gives a warning row
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-026](SwRS-MDOKFSTUDIO-FMSCHEMA-026.md): A schema that cannot be compiled gives a red row
<!-- okf:links:end -->
