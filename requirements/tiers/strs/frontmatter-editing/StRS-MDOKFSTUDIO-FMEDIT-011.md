---
type: StRS
id: StRS-MDOKFSTUDIO-FMEDIT-011
uuid: 1df96293-ffe9-4baf-80e2-d8d61078e1ae
title: Keep metadata editing separate from other editing
description: While a field editor is open, the Studio SHALL block refresh,
  checkbox toggles and block selection and block moves, and keep the properties
  table out of block selection, movement and navigation.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I am not surprised by other edits or refreshes
  interfering with a metadata edit in progress.
derived_by:
- SwRS-MDOKFSTUDIO-FMEDIT-002
- SwRS-MDOKFSTUDIO-FMEDIT-058
- SwRS-MDOKFSTUDIO-FMEDIT-059
- SwRS-MDOKFSTUDIO-FMEDIT-060
- SwRS-MDOKFSTUDIO-FMEDIT-061
- SwRS-MDOKFSTUDIO-FMEDIT-062
- SwRS-MDOKFSTUDIO-FMEDIT-063
- SwRS-MDOKFSTUDIO-FMEDIT-064
- SwRS-MDOKFSTUDIO-FMEDIT-072
- SwRS-MDOKFSTUDIO-FMEDIT-073
- SwRS-MDOKFSTUDIO-FMEDIT-080
---

## Keep metadata editing separate from other editing

### Normative behavior

While a field editor is open, the Studio SHALL block refresh, checkbox toggles and block selection and block moves, and keep the properties table out of block selection, movement and navigation.

### Preserved stakeholder intent

Writers expect an open metadata edit to be protected from refreshes and block selection and block moves.

As a writer, I am not surprised by other edits or refreshes interfering with a metadata edit in progress.

### Rationale and constraints

- Toolbar Refresh is disabled and checkbox toggles are refused with a status message while a field editor is open.
- Known issue: a content patch of the page closes an open field editor and drops its text, and the waiting properties update.
- ArrowUp from the first block editor does not step into the properties table.
