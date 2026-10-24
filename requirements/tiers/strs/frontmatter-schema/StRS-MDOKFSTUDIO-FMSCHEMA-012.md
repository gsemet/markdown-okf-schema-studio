---
type: StRS
id: StRS-MDOKFSTUDIO-FMSCHEMA-012
uuid: ad3e16eb-c72e-481d-b16b-1610eb3edda5
title: Unknown fields can be flagged
description: When `frontmatter.strictAdditionalProperties` is on, the Studio
  SHALL warn on each field that the matching schema does not declare.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a team lead, I want misspelled or stray metadata fields to be
  flagged.
derived_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-042
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
