---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-003
uuid: 3ec737ad-d517-4d3f-8399-267c1c65f9fa
title: "Enum, number, date, boolean and nullable fields use fitting controls"
description: "When a writer opens the editor of a schema enum, number, date, time,
  boolean or nullable field, the extension SHALL show the control that fits the type:
  a select offering the schema values for an enum, a native number, date or time input,
  a one-click toggle for a boolean and a Set to null button for a nullable field."
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-001
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-058
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/frontmatterValueEditor.ts
tested_in_files:
- test/page/fmtableReqFrontmatter.requirements.test.ts
- test/page/runtimeEditorFlush.test.ts
- test/page/runtimeFrontmatterEditor.test.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
---

## Enum, number, date, boolean and nullable fields use fitting controls

### Normative behavior

When a writer opens the editor of a schema enum, number, date, time, boolean or nullable field, the extension SHALL show the control that fits the type: a select offering the schema values for an enum, a native number, date or time input, a one-click toggle for a boolean and a Set to null button for a nullable field.

### Scenario (nominal): Enum fields show a select of the schema values

- GIVEN a schema enum field lifecycle with the values draft and active, currently draft
- WHEN the writer opens its editor
- THEN the select holds the empty "Choose a value..." entry, draft and active, with draft selected; the entry is always the first option and Escape cancels

### Scenario (boundary): The enum select and its commit

| Input | Outcome |
| --- | --- |
| Enum field whose current value is not one of the schema values | The disabled entry "Choose a value..." is selected and the select carries data-okf-empty-select true |
| active chosen, then the select loses focus | One previewFrontmatterSave with fieldValue "active" is posted |
| active chosen, then Enter pressed in the select | One previewFrontmatterSave with fieldValue "active" is posted |
| A value picked and nothing else happens | Nothing is posted: a pick alone does not save (there is no change listener on the select) |
| Value left unchanged | The editor closes without a post |

### Scenario (boundary): Input type per field type

| Input | Outcome |
| --- | --- |
| Schema number field | An input of type number with step any |
| Schema date field | An input of type date |
| Schema time field | An input of type time |
| Schema date-time field | A plain text input, not a date-time picker |
| Any other field type | A text input |

### Scenario (refusal): An invalid number is refused in the editor

| Input | Outcome |
| --- | --- |
| Number field editor with the input emptied, Enter pressed | The status reads "Enter a valid number." in the error state and no message is posted |
| Input that is not a finite number, Enter pressed | The same message and no post |
| Valid number typed, Enter pressed | The value is posted as a number |
| Navigation while the editor is open (a flush) | The typed text is sent instead, see SwRS-MDOKFSTUDIO-FMEDIT-067 |

### Scenario (refusal): Schema limits are left to the check at save time

- GIVEN a schema number field with minimum 0 and maximum 10
- WHEN its editor opens, and the writer saves the value 11
- THEN the input has no min or max attribute and accepts 11 (only step any is set), and the host refuses the save with a message starting "Schema validation failed: " (see SwRS-MDOKFSTUDIO-FMEDIT-016); the schema length and pattern limits are not applied to text controls either

### Scenario (nominal): A boolean field toggles with one click

- GIVEN a schema boolean field set to true, edit mode on
- WHEN the writer clicks its value cell
- THEN one save with fieldValue false is posted and the checkbox uses the preview checkbox style

### Scenario (boundary): Boolean cells reached by other inputs

| Input | Outcome |
| --- | --- |
| Enter on the value cell of the boolean field | The checkbox opens, and its click or change saves |
| Click on the name cell of the boolean field | The key editor opens instead |
| Boolean field without a schema | The YAML editor opens, there is no one-click toggle |

### Scenario (nominal): Nullable fields offer Set to null

- GIVEN a nullable scalar field with its editor open
- WHEN the writer presses "Set to null" (aria-label "Set {name} value to null")
- THEN a save with fieldValue null is posted

### Scenario (boundary): Set to null on lists and on fields that are not nullable

| Input | Outcome |
| --- | --- |
| Nullable list field, editor opened | The button appears inside the list editor as a link-like button and saves null as well |
| Field that is not nullable | No such button |

### Known issues

- Known issue: date-time fields are edited as plain text.
- Known issue: without a schema a boolean field opens the YAML editor, there is no one-click toggle.
- Known issue: the schema minimum, maximum and pattern are not applied to the inputs and a required enum still shows the empty placeholder.

### Related requirements

- SwRS-MDOKFSTUDIO-FMEDIT-016: the host check that refuses a value breaking the field type or the schema.
- SwRS-MDOKFSTUDIO-FMEDIT-019: the commit rules (change, leaving the editor, Escape).
- SwRS-MDOKFSTUDIO-FMEDIT-067: the navigation flush that skips the number check.

### Verification notes

- Method: test/page/runtimeFrontmatterEditor.test.ts (enum select entries and selection; the select posts on blur and Enter, a pick alone and an unchanged value post nothing; one click on a boolean value cell toggles and saves, a boolean name cell still opens the key editor; nullable scalar and nullable list editors set the value to null).
- Method: visual scenario frontmatter-editing/v02-edit-enum-value-dark-900 in test/visual/scenarioDefinitions2.ts (enum select).
- Method: test/page/fmtableReqFrontmatter.requirements.test.ts (number, date and time fields get native inputs and a date-time field stays a text input; the number input carries no schema limits and a value out of range is refused at save time).
- Method: test/page/runtimeEditorFlush.test.ts (an empty or non-finite number is refused with "Enter a valid number." and nothing is posted; a valid number is posted as a number).
- Criteria: The input type follows the field type (number, date, time, otherwise text); only step any is set on number inputs.
