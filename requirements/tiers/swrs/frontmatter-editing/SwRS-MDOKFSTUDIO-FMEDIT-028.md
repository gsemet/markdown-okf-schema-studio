---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-028
uuid: 54eced91-2e1a-46d6-8409-7e4907f04bcc
title: The field action menu offers the missing schema fields or a custom key
description: When a field editor is open, the extension SHALL show inside the
  edited row, after the control, a field action menu labelled "Frontmatter field
  actions" with an "Add field" button that adds a field chosen among the schema
  fields still missing or typed as a custom key.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-005
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-BLOCK-058
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/frontmatterMenu.ts
tested_in_files:
- test/page/runtimeFrontmatterEditor.test.ts
- test/page/runtimeFrontmatterFields.test.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
---

## The field action menu offers the missing schema fields or a custom key

### Normative behavior

When a field editor is open, the extension SHALL show inside the edited row, after the control, a field action menu labelled "Frontmatter field actions" with an "Add field" button that adds a field chosen among the schema fields still missing or typed as a custom key.

### Scenario (nominal): The menu sits in the edited row with an Add field button
| Editor open on the row | Outcome |
| --- | --- |
| a value editor | a toolbar "Frontmatter field actions" sits in the edited row after the control, with a button "Add frontmatter field" labelled Add field |
| a key editor | the same menu with the Add field button appears |

### Scenario (nominal): The picker lists the schema fields still missing
- GIVEN a schema with the missing field owner
- WHEN the writer opens Add field and chooses owner in the select "Frontmatter field to add" (placeholder "Choose a field...")
- THEN an add save for owner is posted at once, placed right after the open row, with the first value found among the schema default, then the empty string

### Scenario (boundary): Default value of the chosen field
| Missing field | Value posted |
| --- | --- |
| boolean | false |
| number | 0 |
| list | an empty list |
| enum | the first enum value |
| a field with a schema default | the schema default |
| any other field | the empty string |

### Scenario (nominal): Without schema fields to add, a typed name is added
- GIVEN a document without a schema (or a schema with no field left to add)
- WHEN the writer opens Add field, types owner in the text input "New field name" and presses Enter or the Add button
- THEN an add save for owner with an empty value is posted, after the open field (afterField)

### Scenario (boundary): The Add button waits for a name
- GIVEN no name typed in the text input
- WHEN the picker is shown
- THEN the button "Add selected frontmatter field" is disabled until a name is typed

### Scenario (nominal): Custom key when extra properties are allowed
- GIVEN a picker listing schema fields and a schema that allows additional properties
- WHEN the writer chooses "Custom key…"
- THEN a "New field name" input appears, nothing is posted, and Enter in it with the name notes posts an add of notes with an empty value

### Scenario (boundary): No Custom key when extra properties are forbidden
- GIVEN a schema root with additionalProperties false and schema fields left to add
- WHEN the picker renders
- THEN it lists the fields and has no "Custom key…" entry (the properties section carries the flag described in SwRS-MDOKFSTUDIO-FMSCHEMA-084)

### Scenario (refusal): An invalid custom key name is refused in the picker
| Custom key typed, then Enter | Message in the editor status (nothing is posted) |
| --- | --- |
| empty, or only spaces | "Enter a name for the new field." |
| surrounding spaces | "The field name cannot start or end with spaces." |
| a line break | "The field name cannot contain a line break." |
| a name already shown in the table | 'The field "x" already exists.' |

### Scenario (boundary): The menu stays inside its row in a narrow preview
| Preview width | Outcome |
| --- | --- |
| normal | neither the value nor another row is covered by the menu or its tooltips |
| about 520 px | the menu and its tooltips wrap inside the edited row and cover nothing |

### Known issues
- Known issue: a typed name that already exists is refused by the host with the stale-field message, not with an already-exists message.

### Related requirements
- SwRS-MDOKFSTUDIO-FMEDIT-037: where the added field is inserted and how its editor opens.
- SwRS-MDOKFSTUDIO-FMEDIT-029: the Remove field button of the same menu.
- SwRS-MDOKFSTUDIO-FMEDIT-016: the host refusal of an add that is stale.

### Verification notes
- Method: test/page/runtimeFrontmatterEditor.test.ts (scenario: the menu in the edited row for a value editor and a key editor).
- Method: test/page/runtimeFrontmatterFields.test.ts (scenarios: T24 choosing a field in the picker adds it right after the open row, default values, T24 the text-input picker adds on Enter with afterField, disabled Add button, T25 the picker offers Custom key only when additional properties are allowed, T25 choosing Custom key and Enter, T25 an invalid custom key shows an error and posts nothing).
- Method: visual scenario frontmatter-editing/v02-edit-enum-value-dark-900 in test/visual/scenarioDefinitions2.ts and the real-input scenario of the field menu (scenario: layout inside the row at a normal width and at about 520 px).
- Criteria: the layout check needs a real browser; the unit test only checks that the menu is present.
