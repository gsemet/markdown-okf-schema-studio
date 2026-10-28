---
type: StRS
id: StRS-MDOKFSTUDIO-FMSCHEMA-011
uuid: 64be220d-648d-445e-99db-58394ceda176
title: Validation problems show on the field concerned
description: When a document's frontmatter violates its schema, the Studio SHALL
  mark the field concerned, summarise the issues in a badge and list the missing
  required fields.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: StRS
annotation_exemption: true
exemption_reason: "Superseded by StRS-MDOKFSTUDIO-FMSCHEMA-010; no marker expected."
derives_from: []
user_need: As a writer, I see exactly which metadata is wrong, and can jump to
  it.
derived_by: []
superseded_by: StRS-MDOKFSTUDIO-FMSCHEMA-010
default_owner_email: gaetan@xeberon.net
---

## Validation problems show on the field concerned

### Normative behavior

When a document's frontmatter violates its schema, the Studio SHALL mark the field concerned, summarise the issues in a badge and list the missing required fields.

### Preserved stakeholder intent

Writers fix metadata faster when each message sits on its field and a count tells how much is left.

As a writer, I see exactly which metadata is wrong, and can jump to it.

### Rationale and constraints

- Validation uses JSON Schema 2020-12 with formats and reports all errors; each error attaches to its field row (red underline, tooltip); "Required field "x" is missing." for a missing required field, which gets an empty row; an error naming no field becomes its own red row.
- A red line under the table reads "Missing required fields: a, b" in schema order.
- The title badge counts errors, warnings and (only when neither exists) infos; pressing it scrolls the first row with an issue to the centre, focuses its value cell and highlights it for 1.5 s. Known issue: when only info rows carry issues the badge does nothing.
- A root `additionalProperties: false` reports every undeclared field as a schema error row "must NOT have additional properties" regardless of the strict setting. Known issue: that error is not attached to the field row.
- Messages are the English texts of the validator (for example "must be <= 5"); unknown schema keywords are ignored silently.
