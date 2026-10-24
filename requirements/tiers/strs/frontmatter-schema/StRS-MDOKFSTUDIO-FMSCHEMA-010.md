---
type: StRS
id: StRS-MDOKFSTUDIO-FMSCHEMA-010
uuid: 60fdf0e4-1e1c-4639-8d9e-18bec4cfa145
title: Fields follow the schema
description: When a document's type has a schema, the Studio SHALL list its
  fields in schema order with their type, description and allowed values.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I see which fields the schema expects, in a stable
  order, with their meaning.
derived_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-029
- SwRS-MDOKFSTUDIO-FMSCHEMA-030
- SwRS-MDOKFSTUDIO-FMSCHEMA-031
- SwRS-MDOKFSTUDIO-FMSCHEMA-032
- SwRS-MDOKFSTUDIO-FMSCHEMA-033
- SwRS-MDOKFSTUDIO-FMSCHEMA-034
---

## Fields follow the schema

### Normative behavior

When a document's type has a schema, the Studio SHALL list its fields in schema order with their type, description and allowed values.

### Preserved stakeholder intent

Knowing the expected shape is the point of a schema; the writer should not consult the schema file.

As a writer, I see which fields the schema expects, in a stable order, with their meaning.

### Rationale and constraints

- The table has three columns (Name, Value, Description): declared present fields first in schema order, then undeclared keys in source order; names carry a type icon and a "(type)" label, and the row tooltip lists title, description, allowed values and issue messages.
- Properties from `allOf`, `anyOf` and `oneOf` branches are merged in declaration order, `if`/`then`/`else` follows the branch the values select, and `required` lists of visited branches apply. Known issue: `anyOf` and `oneOf` branches are merged even when they do not match (display only).
- The displayed type is enum, datetime, date, time, boolean, number, list, text or unknown; without a schema it follows the value. Known issue: `type: object` fields are labelled "(unknown)".
- Field names such as `constructor` or `toString` are neither present nor declared unless they really are.
