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
req_lifecycle: proposed
status: stable
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

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-FMEDIT-024](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-024.md): A click on a field name renames the key
  - [SwRS-MDOKFSTUDIO-FMEDIT-025](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-025.md): Enter or leaving the key editor renames the key
  - [SwRS-MDOKFSTUDIO-FMEDIT-026](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-026.md): An empty or padded key name is refused in the key editor
  - [SwRS-MDOKFSTUDIO-FMEDIT-027](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-027.md): The host refuses a rename to a name already used
  - [SwRS-MDOKFSTUDIO-FMEDIT-028](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-028.md): The field action menu offers the missing schema fields or a custom key
  - [SwRS-MDOKFSTUDIO-FMEDIT-029](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-029.md): Remove field deletes exactly the lines of a non-required field
  - [SwRS-MDOKFSTUDIO-FMEDIT-030](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-030.md): Remove field deletes exactly the lines of the field
  - [SwRS-MDOKFSTUDIO-FMEDIT-031](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-031.md): Remove field is disabled for a schema-required field
  - [SwRS-MDOKFSTUDIO-FMEDIT-032](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-032.md): The host refuses to remove a required field
  - [SwRS-MDOKFSTUDIO-FMEDIT-033](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-033.md): The Add field picker lists the schema fields still missing
  - [SwRS-MDOKFSTUDIO-FMEDIT-034](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-034.md): Without schema fields to add, a typed field name is added
  - [SwRS-MDOKFSTUDIO-FMEDIT-035](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-035.md): The picker offers a Custom key when extra properties are allowed
  - [SwRS-MDOKFSTUDIO-FMEDIT-036](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-036.md): An invalid custom key name is refused in the picker
  - [SwRS-MDOKFSTUDIO-FMEDIT-037](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-037.md): An added field is one inserted line where its row shows, and its editor opens
  - [SwRS-MDOKFSTUDIO-FMEDIT-038](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-038.md): Without a schema, an added field follows the row whose menu was used
  - [SwRS-MDOKFSTUDIO-FMEDIT-039](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-039.md): An added field is a single inserted line in the file's line endings
  - [SwRS-MDOKFSTUDIO-FMEDIT-040](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-040.md): The editor of an added field opens by itself once
  - [SwRS-MDOKFSTUDIO-FMEDIT-041](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-041.md): A pending new-field editor is dropped when it cannot be used
  - [SwRS-MDOKFSTUDIO-FMEDIT-042](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-042.md): A new custom key is saved as a plain scalar when that is safe
  - [SwRS-MDOKFSTUDIO-FMEDIT-043](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-043.md): A frontmatter edit changes only the lines of its field
  - [SwRS-MDOKFSTUDIO-FMEDIT-084](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-084.md): The field action menu stays inside its row in a narrow preview
  - [SwRS-MDOKFSTUDIO-FMEDIT-086](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-086.md): A closed schema flags the properties section
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-084](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-084.md): Every schema violation is reported on its field or in a row of its own
- Supersedes:
  - [StRS-MDOKFSTUDIO-FMEDIT-006](StRS-MDOKFSTUDIO-FMEDIT-006.md): Add a metadata field
  - [StRS-MDOKFSTUDIO-FMEDIT-007](StRS-MDOKFSTUDIO-FMEDIT-007.md): Remove a metadata field
<!-- okf:links:end -->
