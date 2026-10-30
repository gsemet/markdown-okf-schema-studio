---
type: StRS
id: StRS-MDOKFSTUDIO-FMSCHEMA-007
uuid: 2f83edb0-adc2-438c-a30b-b4ff2a8c7ff6
title: Schema files can be written in several formats and share parts
description: When a schema file is written in YAML, JSON or JSON5 and refers to
  other schema files, the Studio SHALL load it and inline the referenced parts.
project: markdown-okf-schema-studio
scope: frontmatter-schema
req_lifecycle: superseded
status: deprecated
origin: native
tier: StRS
derives_from: []
user_need: As a schema author, I write schemas in the format I prefer and reuse
  shared definitions across files.
derived_by: []
superseded_by:
- StRS-MDOKFSTUDIO-FMSCHEMA-006
default_owner_email: gaetan@xeberon.net
---

## Schema files can be written in several formats and share parts

### Normative behavior

When a schema file is written in YAML, JSON or JSON5 and refers to other schema files, the Studio SHALL load it and inline the referenced parts.

### Preserved stakeholder intent

Schemas are shared team assets; format and reuse should not be a barrier.

As a schema author, I write schemas in the format I prefer and reuse shared definitions across files.

### Rationale and constraints

- JSON5 support is minimal: only line and block comments (outside strings) are stripped; trailing commas and unquoted keys fail as a schema that cannot be parsed.
- A relative `$ref` that is a whole node is inlined from the schema folder, trying the name as written then `.json`, `.json5`, `.yaml`, `.yml`, with the extension fallbacks; a fragment written without the leading slash (`base.schema.yaml#defs`) selects that key. Known issue: a standard JSON pointer (`#/defs/s`) leaves the property that holds the reference without a schema, so the schema does not compile and the table shows the red row "Schema validation failed to run"; a second reference to a file that is already inlined, a reference cycle and a missing target all become a reference to the schema root.
- Known issue: a `$ref` such as `../../x.yaml` is read even when it leaves the schema folder (workspace trust applies).

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Superseded by:
  - [StRS-MDOKFSTUDIO-FMSCHEMA-006](StRS-MDOKFSTUDIO-FMSCHEMA-006.md): A document finds its schema and schema problems are reported
<!-- okf:links:end -->
