---
type: StRS
id: StRS-MDOKFSTUDIO-FMEDIT-006
uuid: aea53ba1-2abd-4b1b-be6e-8704409e2203
title: Add a metadata field
description: When a writer chooses Add field from a field editor, the Studio
  SHALL add a schema field or a custom key at the place its row appears and open
  its editor.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I add the metadata fields my schema expects, or a custom
  one, and fill them in at once.
derived_by:
- SwRS-MDOKFSTUDIO-FMEDIT-028
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
- SwRS-MDOKFSTUDIO-FMEDIT-084
- SwRS-MDOKFSTUDIO-FMEDIT-086
---

## Add a metadata field

### Normative behavior

When a writer chooses Add field from a field editor, the Studio SHALL add a schema field or a custom key at the place its row appears and open its editor.

### Preserved stakeholder intent

Writers expect new fields to appear where the schema puts them, ready to be filled.

As a writer, I add the metadata fields my schema expects, or a custom one, and fill them in at once.

### Rationale and constraints

- With schema fields left to add the picker lists them; otherwise, or with Custom key, a name is typed.
- A new field is inserted as a one-line edit where its row will show, and its editor opens once after the table is re-rendered.
- Known issue: adding a key that already exists gets the generic stale-field message from the host, not an already-exists message.
