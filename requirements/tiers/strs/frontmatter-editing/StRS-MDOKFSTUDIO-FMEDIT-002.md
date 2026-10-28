---
type: StRS
id: StRS-MDOKFSTUDIO-FMEDIT-002
uuid: e6e1daa6-70c6-4a96-a126-82b09537866c
title: Edit each kind of metadata value with a fitting control
description: 'When a writer edits a metadata value, the Studio SHALL offer a control
  that fits the field type: a choice list for enums, a text box, number, date and
  time inputs, a checkbox, an item list or a YAML text box.'
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I change a metadata value with a control suited to its
  type so that I enter valid values without knowing YAML.
derived_by: []
superseded_by:
- StRS-MDOKFSTUDIO-FMEDIT-001
default_owner_email: gaetan@xeberon.net
---

## Edit each kind of metadata value with a fitting control

### Normative behavior

When a writer edits a metadata value, the Studio SHALL offer a control that fits the field type: a choice list for enums, a text box, number, date and time inputs, a checkbox, an item list or a YAML text box.

### Preserved stakeholder intent

Writers expect each metadata value to be entered with a control that matches its type.

As a writer, I change a metadata value with a control suited to its type so that I enter valid values without knowing YAML.

### Rationale and constraints

- Enum values come from the schema; booleans toggle on one click; fields without a schema, of unknown type or holding an object are edited as YAML.
- A nullable field offers Set to null; the schema is not applied to the controls, so out-of-range values are caught only at save time.
- Known issue: the schema minimum, maximum and pattern are not applied to the number and text inputs.
- Known issue: without a schema a boolean is edited as text, and date-time fields are edited as plain text.
