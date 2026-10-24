---
type: StRS
id: StRS-MDOKFSTUDIO-FMEDIT-007
uuid: d58ea364-a0bc-41f6-8a56-04dde5c4dceb
title: Remove a metadata field
description: When a writer chooses Remove field from a field editor, the Studio
  SHALL delete exactly that field and refuse to remove a field the schema
  requires.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I remove an obsolete metadata field safely, without
  losing other fields or comments.
derived_by:
- SwRS-MDOKFSTUDIO-FMEDIT-029
- SwRS-MDOKFSTUDIO-FMEDIT-030
- SwRS-MDOKFSTUDIO-FMEDIT-031
- SwRS-MDOKFSTUDIO-FMEDIT-032
---

## Remove a metadata field

### Normative behavior

When a writer chooses Remove field from a field editor, the Studio SHALL delete exactly that field and refuse to remove a field the schema requires.

### Preserved stakeholder intent

Writers expect removing a field to take away that field and nothing else.

As a writer, I remove an obsolete metadata field safely, without losing other fields or comments.

### Rationale and constraints

- Comment lines above the field are kept; removing the only field leaves a valid empty mapping.
- A field the schema requires has a disabled Remove button and the host also refuses the removal.
