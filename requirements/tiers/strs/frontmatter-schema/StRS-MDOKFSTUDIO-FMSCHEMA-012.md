---
type: StRS
id: StRS-MDOKFSTUDIO-FMSCHEMA-012
uuid: ad3e16eb-c72e-481d-b16b-1610eb3edda5
title: Unknown fields can be flagged
description: When `frontmatter.strictAdditionalProperties` is on, the Studio
  SHALL warn on each field that the matching schema does not declare.
project: markdown-okf-schema-studio
scope: frontmatter-schema
req_lifecycle: superseded
status: deprecated
origin: native
tier: StRS
derives_from: []
user_need: As a team lead, I want misspelled or stray metadata fields to be
  flagged.
derived_by: []
superseded_by:
- StRS-MDOKFSTUDIO-FMSCHEMA-010
default_owner_email: gaetan@xeberon.net
---

## Unknown fields can be flagged

### Normative behavior

When `frontmatter.strictAdditionalProperties` is on, the Studio SHALL warn on each field that the matching schema does not declare.

### Preserved stakeholder intent

Typos in field names silently escape validation unless undeclared fields are called out.

As a team lead, I want misspelled or stray metadata fields to be flagged.

### Rationale and constraints

- The setting is a boolean, off by default; on, each undeclared field is listed with "Unknown field; it is not declared in the "{type}" schema." and the badge counts it; off, such fields are listed without warning.
- It applies only when a schema matched and is independent of the schema's own `additionalProperties`.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Superseded by:
  - [StRS-MDOKFSTUDIO-FMSCHEMA-010](StRS-MDOKFSTUDIO-FMSCHEMA-010.md): Fields follow the schema and problems show on the field concerned
<!-- okf:links:end -->
