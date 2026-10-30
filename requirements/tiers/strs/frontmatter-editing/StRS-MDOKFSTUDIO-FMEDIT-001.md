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
req_lifecycle: proposed
status: stable
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

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-BLOCK-041](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-041.md): One edit at a time: an open editor blocks other edits, opens and refreshes
  - [SwRS-MDOKFSTUDIO-BLOCK-058](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-058.md): Every host source edit is one undo step, renders once and reports a failed apply
  - [SwRS-MDOKFSTUDIO-BLOCK-228](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-228.md): Opening, saving and closing an editor keep the reading position
  - [SwRS-MDOKFSTUDIO-FMEDIT-001](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-001.md): A click on a field in edit mode opens its editor in place
  - [SwRS-MDOKFSTUDIO-FMEDIT-002](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-002.md): A field editor does not open while another editor is open
  - [SwRS-MDOKFSTUDIO-FMEDIT-003](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-003.md): Enum, number, date, boolean and nullable fields use fitting controls
  - [SwRS-MDOKFSTUDIO-FMEDIT-004](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-004.md): Text values are edited as one or several lines
  - [SwRS-MDOKFSTUDIO-FMEDIT-005](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-005.md): Trailing line breaks of a text value are dropped
  - [SwRS-MDOKFSTUDIO-FMEDIT-006](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-006.md): A multi-line text value is written as a literal block
  - [SwRS-MDOKFSTUDIO-FMEDIT-007](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-007.md): Number, date and time fields use native inputs
  - [SwRS-MDOKFSTUDIO-FMEDIT-008](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-008.md): An invalid number is refused in the editor
  - [SwRS-MDOKFSTUDIO-FMEDIT-009](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-009.md): A boolean field toggles with one click
  - [SwRS-MDOKFSTUDIO-FMEDIT-010](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-010.md): List fields and link lists are edited item by item
  - [SwRS-MDOKFSTUDIO-FMEDIT-011](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-011.md): Enter in a list item inserts an empty item after it
  - [SwRS-MDOKFSTUDIO-FMEDIT-012](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-012.md): List items reorder by keyboard and drag
  - [SwRS-MDOKFSTUDIO-FMEDIT-013](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-013.md): A plain click on a link value edits the field
  - [SwRS-MDOKFSTUDIO-FMEDIT-014](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-014.md): Link lists suggest the known Markdown file stems
  - [SwRS-MDOKFSTUDIO-FMEDIT-015](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-015.md): Fields without a schema type are edited as YAML text
  - [SwRS-MDOKFSTUDIO-FMEDIT-016](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-016.md): The host refuses a value that breaks YAML, the field type or the schema
  - [SwRS-MDOKFSTUDIO-FMEDIT-017](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-017.md): Nullable fields offer Set to null
  - [SwRS-MDOKFSTUDIO-FMEDIT-018](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-018.md): A null value is refused for a field that is not nullable
  - [SwRS-MDOKFSTUDIO-FMEDIT-019](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-019.md): A field editor saves a changed value and Escape cancels it
  - [SwRS-MDOKFSTUDIO-FMEDIT-020](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-020.md): Escape cancels a field editor
  - [SwRS-MDOKFSTUDIO-FMEDIT-021](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-021.md): Turning edit mode off closes a field editor without saving
  - [SwRS-MDOKFSTUDIO-FMEDIT-022](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-022.md): A save in flight disables the editor and shows Saving
  - [SwRS-MDOKFSTUDIO-FMEDIT-023](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-023.md): A refused field save stays visible in the editor
  - [SwRS-MDOKFSTUDIO-FMEDIT-050](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-050.md): Editor controls do not apply the schema hints
  - [SwRS-MDOKFSTUDIO-FMEDIT-055](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-055.md): Each frontmatter save is one document edit
  - [SwRS-MDOKFSTUDIO-FMEDIT-056](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-056.md): Undo and redo keys in a field editor act on the field text
  - [SwRS-MDOKFSTUDIO-FMEDIT-057](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-057.md): The properties section keeps its place across the save
  - [SwRS-MDOKFSTUDIO-FMEDIT-065](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-065.md): A field editor opens and closes on Escape in a 460 px preview without page overflow
  - [SwRS-MDOKFSTUDIO-FMEDIT-066](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-066.md): Field and key editors have no palette or slash menu
  - [SwRS-MDOKFSTUDIO-FMEDIT-074](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-074.md): A chosen enum value is posted when the select loses focus or Enter is pressed
  - [SwRS-MDOKFSTUDIO-FMEDIT-075](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-075.md): Shift+Enter adds a line in a text field without saving
  - [SwRS-MDOKFSTUDIO-FMEDIT-076](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-076.md): In a multi-line text value Enter adds a line and Cmd or Ctrl+Enter saves
  - [SwRS-MDOKFSTUDIO-FMEDIT-077](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-077.md): Backspace in an empty list item removes it
  - [SwRS-MDOKFSTUDIO-FMEDIT-078](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-078.md): Cmd or Ctrl+Enter in a list item saves the list
  - [SwRS-MDOKFSTUDIO-FMEDIT-079](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-079.md): A null value is refused when a conditional rule forbids it
  - [SwRS-MDOKFSTUDIO-FMEDIT-081](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-081.md): A chosen enum value is posted when the select loses focus or Enter is pressed
  - [SwRS-MDOKFSTUDIO-FMEDIT-082](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-082.md): An accepted field save shows that the preview is refreshing
  - [SwRS-MDOKFSTUDIO-FMEDIT-087](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-087.md): A tall properties table scrolls to both ends at 460 px and returns to line 1 on source sync
- Supersedes:
  - [StRS-MDOKFSTUDIO-FMEDIT-002](StRS-MDOKFSTUDIO-FMEDIT-002.md): Edit each kind of metadata value with a fitting control
  - [StRS-MDOKFSTUDIO-FMEDIT-003](StRS-MDOKFSTUDIO-FMEDIT-003.md): Edit list fields and link lists item by item
  - [StRS-MDOKFSTUDIO-FMEDIT-004](StRS-MDOKFSTUDIO-FMEDIT-004.md): Save, cancel and follow metadata edits
<!-- okf:links:end -->
