---
type: StRS
id: StRS-MDOKFSTUDIO-FMSCHEMA-005
uuid: 02c02ed1-c8c1-45ac-8fd8-b29441cac826
title: Frontmatter settings control the table and apply live
description: When a writer changes a `frontmatter.*` setting, the Studio SHALL
  update the open previews without reopening them, and when
  `frontmatter.propertiesTable` is off SHALL show neither the table nor the raw
  YAML.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: StRS
annotation_exemption: true
exemption_reason: "Superseded by StRS-MDOKFSTUDIO-FMSCHEMA-001; no marker expected."
derives_from: []
user_need: As a writer, I turn the metadata table off or adjust how frontmatter
  is checked and see the effect at once.
derived_by: []
superseded_by: StRS-MDOKFSTUDIO-FMSCHEMA-001
default_owner_email: gaetan@xeberon.net
---

## Frontmatter settings control the table and apply live

### Normative behavior

When a writer changes a `frontmatter.*` setting, the Studio SHALL update the open previews without reopening them, and when `frontmatter.propertiesTable` is off SHALL show neither the table nor the raw YAML.

### Preserved stakeholder intent

Some writers want the text only; settings must not require closing previews.

As a writer, I turn the metadata table off or adjust how frontmatter is checked and see the effect at once.

### Rationale and constraints

- `frontmatter.propertiesTable` is a boolean, on by default; off, the body (its first heading) still renders. The frontmatter is still parsed and validated while it is off, but nothing is shown.
- Any change to a `frontmatter.*` setting (table, strict additional properties, bundle root, project root, outside-workspace links) re-analyses the open preview whose document is the active editor's document; other previews are only re-rendered from their last good render (Known issue).
