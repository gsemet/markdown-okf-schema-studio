---
type: StRS
id: StRS-MDOKFSTUDIO-FMSCHEMA-014
uuid: 3ca5f672-1dfb-4a58-adbe-a8d8547a8158
title: Link fields are declared in the schema
description: When a schema annotates a field with `x-okf-link`, the Studio SHALL
  treat that field's values as links to files and report invalid annotations or
  values.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a schema author, I declare that a field points to files so that
  writers get checked, navigable references.
derived_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-046
- SwRS-MDOKFSTUDIO-FMSCHEMA-047
- SwRS-MDOKFSTUDIO-FMSCHEMA-048
- SwRS-MDOKFSTUDIO-FMSCHEMA-049
---

## Link fields are declared in the schema

### Normative behavior

When a schema annotates a field with `x-okf-link`, the Studio SHALL treat that field's values as links to files and report invalid annotations or values.

### Preserved stakeholder intent

References between documents (evidence, sources) should be verified and followable, not plain text.

As a schema author, I declare that a field points to files so that writers get checked, navigable references.

### Rationale and constraints

- Annotations are found on top-level and nested properties, array items (`items`, `prefixItems`), `patternProperties`, `additionalProperties`, local `$ref`s, every `allOf` branch, the matching `anyOf` branches, the single matching `oneOf` branch and the selected `if`/`then`/`else` branch; duplicate links are reported once and nested results attach to the top-level field.
- An invalid annotation (not an object, missing or unknown `resolution` or `syntax`, non-string markers, field lists that are not lists of names, non-boolean `show_line_number`) marks the field with "[E10] x-okf-link ... at '{field}'".
- A non-string value, a wikilink not written `[[target]]` or `[[target|label]]`, or an empty target is an error; `#fragment` and `?query` are split off and kept for navigation. Syntaxes are plain and wikilink.
