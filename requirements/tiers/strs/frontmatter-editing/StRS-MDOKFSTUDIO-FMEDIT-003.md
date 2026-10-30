---
type: StRS
id: StRS-MDOKFSTUDIO-FMEDIT-003
uuid: c961667b-a25d-485b-b161-a491f8646afd
title: Edit list fields and link lists item by item
description: When a writer edits a list field, the Studio SHALL show one input
  per item that can be added, removed and reordered, and suggest known Markdown
  file names for filename-stem link lists.
project: markdown-okf-schema-studio
scope: frontmatter-editing
req_lifecycle: superseded
status: deprecated
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I maintain list metadata such as related documents item
  by item, with help picking existing files.
derived_by: []
superseded_by:
- StRS-MDOKFSTUDIO-FMEDIT-001
default_owner_email: gaetan@xeberon.net
---

## Edit list fields and link lists item by item

### Normative behavior

When a writer edits a list field, the Studio SHALL show one input per item that can be added, removed and reordered, and suggest known Markdown file names for filename-stem link lists.

### Preserved stakeholder intent

Writers expect lists such as related documents to be edited without writing YAML syntax.

As a writer, I maintain list metadata such as related documents item by item, with help picking existing files.

### Rationale and constraints

- Items are inputs with a drag handle, a remove button and Add item; there is no Save or Cancel button, leaving the editor saves.
- A filename not found among the Markdown files only warns; the value is still saved as typed.
- Known issue: list items are edited as strings, so a non-string item type is saved as text.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Superseded by:
  - [StRS-MDOKFSTUDIO-FMEDIT-001](StRS-MDOKFSTUDIO-FMEDIT-001.md): A writer edits metadata values in place with fitting controls
<!-- okf:links:end -->
