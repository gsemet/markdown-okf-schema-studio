---
type: StRS
id: StRS-MDOKFSTUDIO-FMEDIT-005
uuid: f86c0416-4b0a-453c-8e41-39d6096e4201
title: A writer adds, renames and removes metadata fields
description: When a writer renames a field by clicking its name in edit mode, or
  chooses Add field or Remove field from a field editor, the Studio SHALL rename
  the key in place, add a schema field or a custom key at the place its row
  appears, or delete exactly that field, refusing an empty, padded or already
  used name and the removal of a required field.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: proposed
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I rename a metadata key without touching the rest of the
  frontmatter, add the metadata fields my schema expects, or a custom one, and
  fill them in at once, and remove an obsolete field safely, without losing
  other fields or comments.
derived_by:
- SwRS-MDOKFSTUDIO-FMEDIT-024
- SwRS-MDOKFSTUDIO-FMEDIT-025
- SwRS-MDOKFSTUDIO-FMEDIT-026
- SwRS-MDOKFSTUDIO-FMEDIT-027
- SwRS-MDOKFSTUDIO-FMEDIT-028
- SwRS-MDOKFSTUDIO-FMEDIT-029
- SwRS-MDOKFSTUDIO-FMEDIT-030
- SwRS-MDOKFSTUDIO-FMEDIT-031
- SwRS-MDOKFSTUDIO-FMEDIT-032
- SwRS-MDOKFSTUDIO-FMEDIT-033
- SwRS-MDOKFSTUDIO-FMEDIT-034
- SwRS-MDOKFSTUDIO-FMEDIT-035
- SwRS-MDOKFSTUDIO-FMEDIT-036
- SwRS-MDOKFSTUDIO-FMEDIT-037
- SwRS-MDOKFSTUDIO-FMEDIT-038
- SwRS-MDOKFSTUDIO-FMEDIT-039
- SwRS-MDOKFSTUDIO-FMEDIT-040
- SwRS-MDOKFSTUDIO-FMEDIT-041
- SwRS-MDOKFSTUDIO-FMEDIT-042
- SwRS-MDOKFSTUDIO-FMEDIT-043
- SwRS-MDOKFSTUDIO-FMEDIT-084
- SwRS-MDOKFSTUDIO-FMEDIT-086
- SwRS-MDOKFSTUDIO-FMSCHEMA-084
default_owner_email: gaetan@xeberon.net
supersedes:
- StRS-MDOKFSTUDIO-FMEDIT-006
- StRS-MDOKFSTUDIO-FMEDIT-007
---

## A writer adds, renames and removes metadata fields

### Normative behavior

When a writer renames a field by clicking its name in edit mode, or chooses Add field or Remove field from a field editor, the Studio SHALL rename the key in place, add a schema field or a custom key at the place its row appears, or delete exactly that field, refusing an empty, padded or already used name and the removal of a required field.

### Preserved stakeholder intent

As a writer, I rename a metadata key without touching the rest of the frontmatter, add the metadata fields my schema expects, or a custom one, and fill them in at once, and remove an obsolete field safely, without losing other fields or comments.

### Rationale and constraints

- The key editor suggests schema keys not yet used; an unchanged name just closes the editor.
- An empty or space-padded name is refused in the editor; a name already used is refused by the host.
- With schema fields left to add the picker lists them; otherwise, or with Custom key, a name is typed.
- A new field is inserted as a one-line edit where its row appears, and its editor opens once after the table is re-rendered.
- Known issue: adding a key that already exists gets the generic stale-field message from the host, not an already-exists message.
- Comment lines above a removed field are kept; removing the only field leaves a valid empty mapping.
- A field the schema requires has a disabled Remove button and the host also refuses the removal.
