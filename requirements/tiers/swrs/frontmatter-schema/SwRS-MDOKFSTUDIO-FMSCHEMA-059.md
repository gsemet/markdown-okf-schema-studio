---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-059
uuid: ac97c88b-f363-4c31-94b1-f336c9d377f2
title: The stem index is rebuilt when a Markdown file changes
description: When a Markdown file is created, changed or deleted in a workspace
  folder, the extension SHALL rebuild the filename-stem index, following added
  and removed workspace folders.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-015
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The stem index is rebuilt when a Markdown file changes

### Normative behavior

When a Markdown file is created, changed or deleted in a workspace folder, the extension SHALL rebuild the filename-stem index, following added and removed workspace folders.

### Scenario: File created

- GIVEN a stem that was not found earlier and a new file with that stem created in a workspace folder
- WHEN the document is analysed again
- THEN the link is valid

### Scenario: Folder removed

- GIVEN a workspace folder removed
- WHEN folders change
- THEN the watcher of that folder is disposed

### Verification notes

- Method: Unit test of the stem index; host events test.
- Criteria: One Markdown watcher per workspace root invalidates the cached index of that root.
- Known issue: a bundle root outside the workspace folders is not watched: its index refreshes only when the root folder's own modification time changes, so new files in its sub-folders can be missed.
