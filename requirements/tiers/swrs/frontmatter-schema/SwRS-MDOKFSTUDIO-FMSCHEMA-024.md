---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-024
uuid: 13da0783-9edb-47e8-86d3-a18f249dc18f
title: Relative schema references are inlined from the schema folder
description: When a schema node is exactly a relative `$ref` to another schema
  file of the schema folder, the extension SHALL replace the node with the
  content of that file, trying the name as written then `.json`, `.json5`,
  `.yaml` and `.yml`.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-006
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-023; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMSCHEMA-023
---

## Relative schema references are inlined from the schema folder

### Normative behavior

When a schema node is exactly a relative `$ref` to another schema file of the schema folder, the extension SHALL replace the node with the content of that file, trying the name as written then `.json`, `.json5`, `.yaml` and `.yml`.

### Scenario: Extension fallback

- GIVEN a schema with allOf holding a node `$ref: base.schema` and a folder with base.schema.yml declaring an id string property
- WHEN the document is analysed
- THEN the resolved schema declares the id property and no $ref remains in it

### Scenario: Reference cycle

- GIVEN two schema files that refer to each other
- WHEN the document is analysed
- THEN the first inlined copy is kept, the inner reference stays as a reference to the schema root and the analysis ends

### Scenario: Fragment without a slash

- GIVEN a node `$ref: base.schema.yaml#defs` and a base.schema.yaml whose key defs holds a number schema
- WHEN the document is analysed
- THEN the node is replaced by the content of the defs key

### Scenario: Standard JSON pointer

- GIVEN a node `$ref: base.schema.yaml#/defs/s` for the same file
- WHEN the document is analysed
- THEN the property that holds the reference is left without a schema, the schema does not compile and the red row "Schema validation failed to run: schema is invalid: ..." is shown

### Scenario: Second reference to one file

- GIVEN two properties a and b that both refer to base.schema.yaml, which is not part of a cycle
- WHEN the document is analysed
- THEN a is replaced by the file content and b becomes a reference to the schema root

### Scenario: Missing target

- GIVEN a node `$ref: nope.yaml` whose file does not exist
- WHEN the document is analysed
- THEN the node becomes a reference to the schema root (the fragment alone is kept when the reference has one)

### Verification notes

- Method: Unit test of the reference resolver for the extension fallback only; the other scenarios have no test (probed against the resolver).
- Criteria: Only a node made of a single `$ref` key is inlined; a missing target leaves a reference to the schema root.
- Known issue: a reference such as `../../x.yaml` is read even when it leaves the schema folder (only a trusted workspace reaches this code).
- Known issue: a file reference with a standard JSON-pointer fragment such as `base.schema.yaml#/defs/s` leaves the property that holds it without a schema (the pointer is split with an empty first segment, so the lookup returns undefined); the property stays listed, but Ajv refuses the whole schema ("schema is invalid: data/properties/a must be object,boolean"), the table shows the red row "Schema validation failed to run: ..." and every validation is lost; a fragment without the leading slash such as `base.schema.yaml#defs` selects the key.
- Known issue: the set of inlined files is shared by the whole resolution and never emptied, so a second reference to a file that is already inlined (no cycle) becomes a reference to the schema root and the field is validated against the whole schema.
- Known issue: a missing target becomes a reference to the schema root, not an unresolved reference.
- Known issue: a reference with a sibling keyword next to `$ref` is not inlined.
- Known issue: the reference cycle scenario has no test.
