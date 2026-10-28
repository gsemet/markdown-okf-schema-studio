---
type: StRS
id: StRS-MDOKFSTUDIO-FMEDIT-001
uuid: 73bd36ca-d387-4cac-96ca-fb4f85e6705a
title: A writer edits metadata values in place with fitting controls
description: When a writer clicks, or presses Enter or Space on, a field name or
  value of the properties table in edit mode, the Studio SHALL open an editor
  inside that cell, one at a time, with a control that fits the field type, and
  leave the table inert in reading mode and in a read-only preview.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: proposed
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I edit a document's metadata directly in the properties
  table, where I read it, one field at a time, without leaving the preview or
  fighting other editors; I enter valid values with a control suited to the
  field type, without knowing YAML, including list items one by one, and I know
  whether my edit was saved, refused or cancelled and can undo it.
derived_by:
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-BLOCK-058
- SwRS-MDOKFSTUDIO-BLOCK-228
- SwRS-MDOKFSTUDIO-FMEDIT-001
- SwRS-MDOKFSTUDIO-FMEDIT-002
- SwRS-MDOKFSTUDIO-FMEDIT-003
- SwRS-MDOKFSTUDIO-FMEDIT-004
- SwRS-MDOKFSTUDIO-FMEDIT-005
- SwRS-MDOKFSTUDIO-FMEDIT-006
- SwRS-MDOKFSTUDIO-FMEDIT-007
- SwRS-MDOKFSTUDIO-FMEDIT-008
- SwRS-MDOKFSTUDIO-FMEDIT-009
- SwRS-MDOKFSTUDIO-FMEDIT-010
- SwRS-MDOKFSTUDIO-FMEDIT-011
- SwRS-MDOKFSTUDIO-FMEDIT-012
- SwRS-MDOKFSTUDIO-FMEDIT-013
- SwRS-MDOKFSTUDIO-FMEDIT-014
- SwRS-MDOKFSTUDIO-FMEDIT-015
- SwRS-MDOKFSTUDIO-FMEDIT-016
- SwRS-MDOKFSTUDIO-FMEDIT-017
- SwRS-MDOKFSTUDIO-FMEDIT-018
- SwRS-MDOKFSTUDIO-FMEDIT-019
- SwRS-MDOKFSTUDIO-FMEDIT-020
- SwRS-MDOKFSTUDIO-FMEDIT-021
- SwRS-MDOKFSTUDIO-FMEDIT-022
- SwRS-MDOKFSTUDIO-FMEDIT-023
- SwRS-MDOKFSTUDIO-FMEDIT-050
- SwRS-MDOKFSTUDIO-FMEDIT-055
- SwRS-MDOKFSTUDIO-FMEDIT-056
- SwRS-MDOKFSTUDIO-FMEDIT-057
- SwRS-MDOKFSTUDIO-FMEDIT-065
- SwRS-MDOKFSTUDIO-FMEDIT-066
- SwRS-MDOKFSTUDIO-FMEDIT-074
- SwRS-MDOKFSTUDIO-FMEDIT-075
- SwRS-MDOKFSTUDIO-FMEDIT-076
- SwRS-MDOKFSTUDIO-FMEDIT-077
- SwRS-MDOKFSTUDIO-FMEDIT-078
- SwRS-MDOKFSTUDIO-FMEDIT-079
- SwRS-MDOKFSTUDIO-FMEDIT-081
- SwRS-MDOKFSTUDIO-FMEDIT-082
- SwRS-MDOKFSTUDIO-FMEDIT-087
default_owner_email: gaetan@xeberon.net
supersedes:
- StRS-MDOKFSTUDIO-FMEDIT-002
- StRS-MDOKFSTUDIO-FMEDIT-003
- StRS-MDOKFSTUDIO-FMEDIT-004
---

## A writer edits metadata values in place with fitting controls

### Normative behavior

When a writer clicks, or presses Enter or Space on, a field name or value of the properties table in edit mode, the Studio SHALL open an editor inside that cell, one at a time, with a control that fits the field type, and leave the table inert in reading mode and in a read-only preview.

### Preserved stakeholder intent

As a writer, I edit a document's metadata directly in the properties table, where I read it, one field at a time, without leaving the preview or fighting other editors; I enter valid values with a control suited to the field type, without knowing YAML, including list items one by one, and I know whether my edit was saved, refused or cancelled and can undo it.

### Rationale and constraints

- Only one editor is open at a time; a field editor does not open while a block editor is open.
- Plain clicks on a link inside a field value open the editor in edit mode; Cmd/Ctrl+click still follows the link.
- Known issue: an editor left in an error state blocks every other field until it is cancelled.
- Field and key editors have no edition palette or slash menu.
- The control is a choice list for enums, a text box, number, date and time inputs, a checkbox, an item list or a YAML text box. Enum values come from the schema; booleans toggle on one click; fields without a schema, of unknown type or holding an object are edited as YAML.
- A nullable field offers Set to null; the schema is not applied to the controls, so out-of-range values are caught only at save time.
- Known issue: the schema minimum, maximum and pattern are not applied to the number and text inputs.
- Known issue: without a schema a boolean is edited as text, and date-time fields are edited as plain text.
- A list field shows one input per item that can be added, removed and reordered, and known Markdown file names are suggested for filename-stem link lists. Items are inputs with a drag handle, a remove button and Add item; there is no Save or Cancel button, leaving the editor saves.
- A filename not found among the Markdown files only warns; the value is still saved as typed.
- Known issue: list items are edited as strings, so a non-string item type is saved as text.
- Only a changed value is saved and the progress and any refusal show in the editor; unchanged values are not written; Escape cancels unless a save is in flight; turning edit mode off closes the editor without saving.
- Known issue: leaving edit mode discards an unsaved field value while block editors save theirs.
- A refusal keeps the editor open with the host message shown and the controls enabled again.
- Each save is one edit of the document, so one Undo reverts it; undo keys typed in a field editor act on the field text only.
