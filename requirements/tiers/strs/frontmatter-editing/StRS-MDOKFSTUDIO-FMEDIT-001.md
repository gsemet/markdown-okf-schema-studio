---
type: StRS
id: StRS-MDOKFSTUDIO-FMEDIT-001
uuid: 73bd36ca-d387-4cac-96ca-fb4f85e6705a
title: Open a metadata field editor in place
description: When a writer clicks, or presses Enter or Space on, a field name or
  value of the properties table in edit mode, the Studio SHALL open an editor
  inside that cell, one at a time, and leave the table inert in reading mode and
  in a read-only preview.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I edit a document's metadata directly in the properties
  table without leaving the preview or fighting other editors.
derived_by:
- SwRS-MDOKFSTUDIO-FMEDIT-001
- SwRS-MDOKFSTUDIO-FMEDIT-002
- SwRS-MDOKFSTUDIO-FMEDIT-013
- SwRS-MDOKFSTUDIO-FMEDIT-065
- SwRS-MDOKFSTUDIO-FMEDIT-066
---

## Open a metadata field editor in place

### Normative behavior

When a writer clicks, or presses Enter or Space on, a field name or value of the properties table in edit mode, the Studio SHALL open an editor inside that cell, one at a time, and leave the table inert in reading mode and in a read-only preview.

### Preserved stakeholder intent

Writers expect to correct a document's metadata where they read it, one field at a time.

As a writer, I edit a document's metadata directly in the properties table without leaving the preview or fighting other editors.

### Rationale and constraints

- Only one editor is open at a time; a field editor does not open while a block editor is open.
- Plain clicks on a link inside a field value open the editor in edit mode; Cmd/Ctrl+click still follows the link.
- Known issue: an editor left in an error state blocks every other field until it is cancelled.
- Field and key editors have no edition palette or slash menu.
