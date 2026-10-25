---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-029
uuid: 423c6808-b33c-44e8-b237-20ebe65f2ded
title: A schema table lists the declared fields with their type
description: When a document's type has a schema, the extension SHALL show a
  table with the columns Name, Value and Description that lists the declared
  fields present in the document in schema order, then the other keys in source
  order, each with a type icon and label before its name, a tooltip on its row,
  and the properties of composed schemas merged into one field list.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-010
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/frontmatter/frontmatterValidate.ts
- src/core/frontmatter/propertiesTable.ts
tested_in_files:
- test/core/frontmatter/okfFrontmatter.test.ts
- test/core/frontmatter/propertiesTable.test.ts
- test/visual/scenarioDefinitions1.ts
---

## A schema table lists the declared fields with their type

### Normative behavior

When a document's type has a schema, the extension SHALL show a table with the columns Name, Value and Description that lists the declared fields present in the document in schema order, then the other keys in source order, each with a type icon and label before its name, a tooltip on its row, and the properties of composed schemas merged into one field list.

### Scenario (nominal): Schema order

- GIVEN a schema declaring type, title and owner (in that order) and a document writing type, owner, title and an extra key zz
- WHEN the preview is rendered
- THEN the rows read type, title, owner, zz and the Description column shows each schema description

### Scenario (boundary): Required but absent field

- GIVEN the same schema requiring a field that the document lacks
- WHEN the preview is rendered
- THEN an empty row for the field is appended after the other rows

### Scenario (nominal): Type icon and label

- GIVEN a schema table with a boolean field
- WHEN the preview is rendered
- THEN the name cell holds, before the name, the checkbox icon titled Checkbox (at most 1.5 em) and, after the name, the label (boolean)

### Scenario (boundary): Displayed field type

| Input | Outcome |
| --- | --- |
| a field of type boolean, integer, array, or string with format date-time, or an enum | the labels read boolean, number, list, datetime and enum |
| a field with a format date, date-time or time | the label reads date, datetime or time (the format test comes before the type test) |
| a type list | the first non-null type is used |
| a field declared as type object, a field declared only by anyOf, or a field with no usable type declaration | labelled (unknown), with the icon titled Unknown type |
| a field with enum or const | labelled enum |

### Scenario (nominal): Row tooltip

- GIVEN a field with title Status, description Lifecycle and enum draft and active
- WHEN the preview is rendered
- THEN the row tooltip reads Status, Lifecycle and Allowed: draft, active on separate lines
- AND the same field holding the value retired ends the tooltip with the validation message of the enum

### Scenario (boundary): Composed schemas

| Input | Outcome |
| --- | --- |
| a schema with allOf adding x (required), and if kind is a then ifa (required) else ifb, and a document with kind a | the missing required fields are x and ifa |
| the same document with kind b | the missing required fields are only x, because the then branch is not visited |

### Scenario (refusal): Names equal to object members

| Input | Outcome |
| --- | --- |
| a schema declaring and requiring toString and a document with a key constructor | constructor is an undeclared key and toString is reported as a missing required field |
| a schema that really declares constructor and a document that sets it | constructor is a declared present field |

### Known issues

- Known issue: anyOf and oneOf branches are merged even when they do not match the values (display only; validation is the validator's).
- Known issue: fields declared with type object are labelled (unknown).

### Verification notes

- Method: test/core/frontmatter/okfFrontmatter.test.ts (schema order, required but absent field, displayed field type, composed schemas, names equal to object members).
- Method: test/core/frontmatter/propertiesTable.test.ts (type icon and label, row tooltip, rendering of the displayed type).
- Method: test/visual/scenarioDefinitions1.ts, visual scenario (schema order, required but absent field, icon size check of at most 1.5 em).
- Criteria: Declared present fields come in effective-schema order; undeclared keys in YAML order; absent required fields last. Icon titles: Text, Number, List, Checkbox, Options (enum), Date, Time, Date and time, Unknown type. Without a schema the type follows the value: boolean, number or list, else unknown. The tooltip is empty when the row has no title, description, enum or issue. Later branches extend earlier declarations of the same name; nullable is recorded per field. Properties live in a null-prototype map and are tested with Object.hasOwn.
