---
type: StRS
id: StRS-MDOKFSTUDIO-FMSCHEMA-010
uuid: 60fdf0e4-1e1c-4639-8d9e-18bec4cfa145
title: Fields follow the schema and problems show on the field concerned
description: When a document's type has a schema, the Studio SHALL list its
  fields in schema order with their type, description and allowed values, mark
  each field that violates the schema, summarise the issues in a badge, list the
  missing required fields and warn on undeclared fields when the strict setting
  is on.
project: markdown-okf-schema-studio
scope: frontmatter-schema
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I see which fields the schema expects, in a stable
  order, with their meaning, see exactly which metadata is wrong and jump to it,
  and as a team lead I have misspelled or stray metadata fields flagged.
derived_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-029
- SwRS-MDOKFSTUDIO-FMSCHEMA-030
- SwRS-MDOKFSTUDIO-FMSCHEMA-031
- SwRS-MDOKFSTUDIO-FMSCHEMA-032
- SwRS-MDOKFSTUDIO-FMSCHEMA-033
- SwRS-MDOKFSTUDIO-FMSCHEMA-034
- SwRS-MDOKFSTUDIO-FMSCHEMA-035
- SwRS-MDOKFSTUDIO-FMSCHEMA-036
- SwRS-MDOKFSTUDIO-FMSCHEMA-037
- SwRS-MDOKFSTUDIO-FMSCHEMA-038
- SwRS-MDOKFSTUDIO-FMSCHEMA-039
- SwRS-MDOKFSTUDIO-FMSCHEMA-040
- SwRS-MDOKFSTUDIO-FMSCHEMA-041
- SwRS-MDOKFSTUDIO-FMSCHEMA-042
- SwRS-MDOKFSTUDIO-FMSCHEMA-084
- SwRS-MDOKFSTUDIO-FMSCHEMA-085
- SwRS-MDOKFSTUDIO-FMSCHEMA-089
default_owner_email: gaetan@xeberon.net
supersedes:
- StRS-MDOKFSTUDIO-FMSCHEMA-011
- StRS-MDOKFSTUDIO-FMSCHEMA-012
---

## Fields follow the schema and problems show on the field concerned

### Normative behavior

When a document's type has a schema, the Studio SHALL list its fields in schema order with their type, description and allowed values, mark each field that violates the schema, summarise the issues in a badge, list the missing required fields and warn on undeclared fields when the strict setting is on.

### Preserved stakeholder intent

As a writer, I see which fields the schema expects, in a stable order, with their meaning, see exactly which metadata is wrong and jump to it, and as a team lead I have misspelled or stray metadata fields flagged.

### Rationale and constraints

- The table has three columns (Name, Value, Description): declared present fields first in schema order, then undeclared keys in source order; names carry a type icon and a "(type)" label, and the row tooltip lists title, description, allowed values and issue messages.
- Properties from allOf, anyOf and oneOf branches are merged in declaration order, if/then/else follows the branch the values select, and required lists of visited branches apply.
- Known issue: anyOf and oneOf branches are merged even when they do not match (display only).
- The displayed type is enum, datetime, date, time, boolean, number, list, text or unknown; without a schema it follows the value.
- Known issue: type: object fields are labelled "(unknown)".
- Field names such as constructor or toString are neither present nor declared unless they really are.
- Validation uses JSON Schema 2020-12 with formats and reports all errors; each error attaches to its field row (red underline, tooltip); "Required field "x" is missing." for a missing required field, which gets an empty row; an error naming no field becomes its own red row.
- A red line under the table reads "Missing required fields: a, b" in schema order.
- The title badge counts errors, warnings and (only when neither exists) infos; pressing it scrolls the first row with an issue to the centre, focuses its value cell and highlights it for 1.5 s.
- Known issue: when only info rows carry issues the badge does nothing.
- A root additionalProperties: false reports every undeclared field as a schema error row "must NOT have additional properties" regardless of the strict setting.
- Known issue: that error is not attached to the field row.
- Messages are the English texts of the validator (for example "must be <= 5"); unknown schema keywords are ignored silently.
- The strict additional properties setting is a boolean, off by default; on, each undeclared field is listed with "Unknown field; it is not declared in the "{type}" schema." and the badge counts it; off, such fields are listed without warning.
- The strict setting applies only when a schema matched and is independent of the schema's own additionalProperties.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-029](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-029.md): A schema table lists the declared fields with their type
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-030](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-030.md): Field names show a type icon and a type label
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-031](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-031.md): The row tooltip lists title, description, allowed values and issues
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-032](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-032.md): Composed schemas are merged into one field list
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-033](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-033.md): The displayed field type follows the schema declaration
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-034](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-034.md): Field names equal to object members are not treated as present
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-035](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-035.md): A schema error marks the row of its field
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-036](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-036.md): A missing required field gets an empty row with its error
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-037](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-037.md): An error that names no field becomes a red row of its own
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-038](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-038.md): Missing required fields are summarised under the table
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-039](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-039.md): The title badge counts the issues and jumps to the first one
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-040](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-040.md): The badge jumps to the first row with an issue
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-041](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-041.md): A closed schema reports every undeclared field
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-042](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-042.md): The strict setting warns on undeclared fields
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-084](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-084.md): Every schema violation is reported on its field or in a row of its own
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-085](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-085.md): The badge counts infos only when there is no error or warning
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-089](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-089.md): Every violation of the schema is reported
- Supersedes:
  - [StRS-MDOKFSTUDIO-FMSCHEMA-011](StRS-MDOKFSTUDIO-FMSCHEMA-011.md): Validation problems show on the field concerned
  - [StRS-MDOKFSTUDIO-FMSCHEMA-012](StRS-MDOKFSTUDIO-FMSCHEMA-012.md): Unknown fields can be flagged
<!-- okf:links:end -->
