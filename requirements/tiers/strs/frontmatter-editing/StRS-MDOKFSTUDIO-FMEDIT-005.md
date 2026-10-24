---
type: StRS
id: StRS-MDOKFSTUDIO-FMEDIT-005
uuid: f86c0416-4b0a-453c-8e41-39d6096e4201
title: Rename a metadata field
description: When a writer clicks a field name in edit mode, the Studio SHALL
  let them rename the key in place and refuse an empty, padded or already used
  name.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I rename a metadata key without touching the rest of the
  frontmatter.
derived_by:
- SwRS-MDOKFSTUDIO-FMEDIT-024
- SwRS-MDOKFSTUDIO-FMEDIT-025
- SwRS-MDOKFSTUDIO-FMEDIT-026
- SwRS-MDOKFSTUDIO-FMEDIT-027
---

## Rename a metadata field

### Normative behavior

When a writer clicks a field name in edit mode, the Studio SHALL let them rename the key in place and refuse an empty, padded or already used name.

### Preserved stakeholder intent

Writers expect renaming a key to leave its value, comments and neighbours untouched.

As a writer, I rename a metadata key without touching the rest of the frontmatter.

### Rationale and constraints

- The key editor suggests schema keys not yet used; an unchanged name just closes the editor.
- An empty or space-padded name is refused in the editor; a name already used is refused by the host.
