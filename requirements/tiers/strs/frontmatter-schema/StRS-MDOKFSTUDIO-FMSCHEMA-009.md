---
type: StRS
id: StRS-MDOKFSTUDIO-FMSCHEMA-009
uuid: 6d789909-fad7-4f0f-ab5e-280b4ac7af03
title: Schema edits are picked up on the next analysis
description: When a writer edits a schema file or a file it refers to, the
  Studio SHALL use the new content the next time the document is analysed.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: StRS
annotation_exemption: true
exemption_reason: "Superseded by StRS-MDOKFSTUDIO-FMSCHEMA-006; no marker expected."
derives_from: []
user_need: As a schema author, I edit a schema and see the new rules applied to
  my documents.
derived_by: []
superseded_by: StRS-MDOKFSTUDIO-FMSCHEMA-006
default_owner_email: gaetan@xeberon.net
---

## Schema edits are picked up on the next analysis

### Normative behavior

When a writer edits a schema file or a file it refers to, the Studio SHALL use the new content the next time the document is analysed.

### Preserved stakeholder intent

Schema authors iterate quickly; stale rules would mislead them.

As a schema author, I edit a schema and see the new rules applied to my documents.

### Rationale and constraints

- Resolved schemas and compiled validators are reused only while the schema file and every inlined or probed reference keep the same content (compared by content, not time); edited, replaced, reverted or deleted files are picked up and at most 64 schemas are cached.
- Known issue: editing a schema does not refresh open previews by itself; the table is re-validated on the next document change, refresh, re-render or settings change.
