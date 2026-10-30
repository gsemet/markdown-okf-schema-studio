---
type: StRS
id: StRS-MDOKFSTUDIO-FMSCHEMA-006
uuid: 6431bb3a-8a6d-410b-8416-630e14f0882f
title: A document finds its schema and schema problems are reported
description: When a document's frontmatter has a string type, the Studio SHALL
  look for the matching schema file in the nearest schema folder, load it in
  YAML, JSON or JSON5 with its references inlined, and tell the writer when none
  applies or when the schema cannot be used, without hiding the metadata.
project: markdown-okf-schema-studio
scope: frontmatter-schema
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: As a writer of Open Knowledge Format documents, I get schema-aware
  metadata simply by setting the type and learn when no schema is found; as a
  schema author, I write schemas in the format I prefer, reuse shared
  definitions, see at once that my schema is broken and why, and see my edits
  applied to my documents.
derived_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-005
- SwRS-MDOKFSTUDIO-FMSCHEMA-019
- SwRS-MDOKFSTUDIO-FMSCHEMA-020
- SwRS-MDOKFSTUDIO-FMSCHEMA-021
- SwRS-MDOKFSTUDIO-FMSCHEMA-022
- SwRS-MDOKFSTUDIO-FMSCHEMA-023
- SwRS-MDOKFSTUDIO-FMSCHEMA-024
- SwRS-MDOKFSTUDIO-FMSCHEMA-025
- SwRS-MDOKFSTUDIO-FMSCHEMA-026
- SwRS-MDOKFSTUDIO-FMSCHEMA-027
- SwRS-MDOKFSTUDIO-FMSCHEMA-028
- SwRS-MDOKFSTUDIO-FMSCHEMA-077
- SwRS-MDOKFSTUDIO-FMSCHEMA-078
- SwRS-MDOKFSTUDIO-FMSCHEMA-088
default_owner_email: gaetan@xeberon.net
supersedes:
- StRS-MDOKFSTUDIO-FMSCHEMA-007
- StRS-MDOKFSTUDIO-FMSCHEMA-008
- StRS-MDOKFSTUDIO-FMSCHEMA-009
---

## A document finds its schema and schema problems are reported

### Normative behavior

When a document's frontmatter has a string type, the Studio SHALL look for the matching schema file in the nearest schema folder, load it in YAML, JSON or JSON5 with its references inlined, and tell the writer when none applies or when the schema cannot be used, without hiding the metadata.

### Preserved stakeholder intent

As a writer of Open Knowledge Format documents, I get schema-aware metadata simply by setting the type and learn when no schema is found; as a schema author, I write schemas in the format I prefer, reuse shared definitions, see at once that my schema is broken and why, and see my edits applied to my documents.

### Rationale and constraints

- The schema folder is the first _schema folder (preferred) or _schemas folder found walking up from the document's folder to the workspace folder root.
- The schema file is {type}.schema.yaml, .yml, .json or .json5 whose stem equals the type, case-insensitively; .yaml wins over .yml, .json, .json5.
- A missing schema file shows the info row "No schema found for type "{type}" in {folder}/." and an info badge; no schema folder gives the generic table with no info row.
- In Restricted Mode, and for a standalone file outside the workspace, no schema is looked up and the info row "Schema validation requires a trusted workspace; showing generic frontmatter." is shown.
- The info row appears only when the frontmatter has a string type.
- Known issue: a file outside every workspace folder in a trusted workspace is also told that schema validation requires a trusted workspace.
- JSON5 support is minimal: only line and block comments (outside strings) are stripped; trailing commas and unquoted keys fail as a schema that cannot be parsed.
- A relative reference that is a whole node is inlined from the schema folder, trying the name as written then .json, .json5, .yaml, .yml, with the extension fallbacks; a fragment written without the leading slash (base.schema.yaml#defs) selects that key.
- Known issue: a standard JSON pointer (#/defs/s) leaves the property that holds the reference without a schema, so the schema does not compile and the table shows the red row "Schema validation failed to run"; a second reference to a file that is already inlined, a reference cycle and a missing target all become a reference to the schema root.
- Known issue: a reference such as ../../x.yaml is read even when it leaves the schema folder (workspace trust applies).
- A JSON or JSON5 schema that cannot be read or parsed gives the generic table with the warning row "Schema could not be parsed: {error}".
- An empty or comment-only YAML schema file has no content yet: the type stays without schema, the table is generic and one informational row reads "schema file '{name}' is empty".
- Known issue: a YAML syntax error is not reported (the partly parsed schema is applied silently).
- A schema that cannot be compiled shows a red row "Schema validation failed to run: {diagnostic}" spanning every visible column, counted as one error in the badge; the fields stay listed in schema order with their documentation.
- Resolved schemas and compiled validators are reused only while the schema file and every inlined or probed reference keep the same content (compared by content, not time); edited, replaced, reverted or deleted files are picked up and at most 64 schemas are cached.
- Known issue: editing a schema does not refresh open previews by itself; the table is re-validated on the next document change, refresh, re-render or settings change.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-005](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-005.md): Without a schema the table lists the keys in source order, escaped
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-019](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-019.md): A typed document finds its schema in the nearest schema folder
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-020](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-020.md): The schema file is chosen by the type name
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-021](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-021.md): A missing schema file is reported as an info row
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-022](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-022.md): Schema lookup is off in Restricted Mode and for standalone files
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-023](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-023.md): Schemas in YAML, JSON or JSON5 with relative references compile or report a row
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-024](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-024.md): Relative schema references are inlined from the schema folder
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-025](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-025.md): A schema that cannot be parsed gives a warning row
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-026](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-026.md): A schema that cannot be compiled gives a red row
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-027](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-027.md): Schema edits are picked up on the next analysis
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-028](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-028.md): Editing a schema does not refresh open previews by itself
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-077](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-077.md): The no-lookup info row appears only for typed documents
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-078](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-078.md): At most 64 resolved schemas are kept
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-088](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-088.md): The generic table is shown when no schema lookup is made
- Supersedes:
  - [StRS-MDOKFSTUDIO-FMSCHEMA-007](StRS-MDOKFSTUDIO-FMSCHEMA-007.md): Schema files can be written in several formats and share parts
  - [StRS-MDOKFSTUDIO-FMSCHEMA-008](StRS-MDOKFSTUDIO-FMSCHEMA-008.md): Schema problems are reported without hiding the metadata
  - [StRS-MDOKFSTUDIO-FMSCHEMA-009](StRS-MDOKFSTUDIO-FMSCHEMA-009.md): Schema edits are picked up on the next analysis
<!-- okf:links:end -->
