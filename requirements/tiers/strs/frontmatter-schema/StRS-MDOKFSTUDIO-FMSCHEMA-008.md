---
type: StRS
id: StRS-MDOKFSTUDIO-FMSCHEMA-008
uuid: 834a8012-6a56-4c9a-a5d5-46b8ff36a63b
title: Schema problems are reported without hiding the metadata
description: When a schema file cannot be read, parsed or compiled, the Studio
  SHALL show the metadata as a generic or unvalidated table together with a
  message that names the problem.
project: markdown-okf-schema-studio
scope: frontmatter-schema
req_lifecycle: superseded
status: deprecated
origin: native
tier: StRS
derives_from: []
user_need: As a schema author, I see immediately that my schema is broken and
  why, instead of silently losing validation.
derived_by: []
superseded_by:
- StRS-MDOKFSTUDIO-FMSCHEMA-006
default_owner_email: gaetan@xeberon.net
---

## Schema problems are reported without hiding the metadata

### Normative behavior

When a schema file cannot be read, parsed or compiled, the Studio SHALL show the metadata as a generic or unvalidated table together with a message that names the problem.

### Preserved stakeholder intent

A silent validation failure would make a document look valid when it was never checked.

As a schema author, I see immediately that my schema is broken and why, instead of silently losing validation.

### Rationale and constraints

- A JSON or JSON5 schema that cannot be read or parsed gives the generic table with the warning row "Schema could not be parsed: {error}". An empty or comment-only YAML schema file has no content yet: the type stays without schema, the table is generic and one informational row reads "schema file '{name}' is empty". Known issue: a YAML syntax error is not reported (the partly parsed schema is applied silently).
- A schema that cannot be compiled shows a red row "Schema validation failed to run: {diagnostic}" spanning every visible column, counted as one error in the badge; the fields stay listed in schema order with their documentation.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Superseded by:
  - [StRS-MDOKFSTUDIO-FMSCHEMA-006](StRS-MDOKFSTUDIO-FMSCHEMA-006.md): A document finds its schema and schema problems are reported
<!-- okf:links:end -->
