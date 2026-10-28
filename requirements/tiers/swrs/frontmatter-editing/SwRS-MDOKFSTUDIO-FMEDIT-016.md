---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-016
uuid: d988f095-ed02-414a-897d-50e5094ccc16
title: The host refuses a value that breaks YAML, the field type or the schema
description: 'When the host receives a frontmatter save whose YAML value does not
  parse or is empty, or whose value does not fit the field type or the schema, the
  extension SHALL refuse it with "Invalid YAML value: {parser message}" for a YAML
  value and with the matching message otherwise, and change nothing.'
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-001
- StRS-MDOKFSTUDIO-FMEDIT-008
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-058
- SwRS-MDOKFSTUDIO-TRUST-065
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/edits/frontmatterEdit.ts
tested_in_files:
- test/core/edits/frontmatterEdit.test.ts
- test/integration/previewEditing.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-FMEDIT-018
- SwRS-MDOKFSTUDIO-FMEDIT-047
- SwRS-MDOKFSTUDIO-FMEDIT-048
- SwRS-MDOKFSTUDIO-FMEDIT-049
- SwRS-MDOKFSTUDIO-FMEDIT-079
- SwRS-MDOKFSTUDIO-FMEDIT-083
---

## The host refuses a value that breaks YAML, the field type or the schema

### Normative behavior

When the host receives a frontmatter save whose YAML value does not parse or is empty, or whose value does not fit the field type or the schema, the extension SHALL refuse it with "Invalid YAML value: {parser message}" for a YAML value and with the matching message otherwise, and change nothing.

### Scenario (nominal): A YAML value that does not parse is refused
- GIVEN a save with fieldValueFormat yaml and the text [
- WHEN the host plans the save
- THEN the answer is the error "Invalid YAML value: " followed by the parser message and the document is unchanged

### Scenario (refusal): An empty or non-text YAML value
| Save with fieldValueFormat yaml | Answer |
| --- | --- |
| an empty or blank text | "Invalid YAML value: Enter a YAML value." |
| a non-text payload | "The YAML field value must be text." |

A save with the flush flag skips the parse refusal and keeps the typed text (see SwRS-MDOKFSTUDIO-FMEDIT-067).

### Scenario (refusal): A value that does not fit the field type
| Save received for a schema field | Answer (the document is unchanged) |
| --- | --- |
| null for a field that is not nullable | "The frontmatter field is stale or its value does not match the schema." |
| paused for an enum field with the values draft and active | the same stale-field message |
| a text, date or time that is not a string; a boolean field that is not a boolean; a number that is not finite; a list that is not an array | the same stale-field message |

### Scenario (boundary): Values that are accepted
| Save | Outcome |
| --- | --- |
| null for a nullable schema field | accepted |
| any value for a document without a schema | no type check applies and the value is written |

### Scenario (refusal): A schema error on the edited field
| Save received | Answer (the document is unchanged) |
| --- | --- |
| a value that violates a constraint of the schema field | "Schema validation failed: " followed by the schema message |
| null for a nullable field that a conditional (if/then) rule requires to be set | "Schema validation failed: " followed by the schema message |
| a rename after which the field cannot be found in the re-analysis | "The renamed frontmatter field could not be validated." |
| null for a field whose conditional (if/then) rule does not apply because the condition is not met | not refused: the same null save is accepted and written |

### Scenario (boundary): Only errors of the edited field block a save
| Situation | Outcome |
| --- | --- |
| the only error of the edited field is a broken link | the save is accepted |
| another field of the frontmatter has a schema error and a different field is edited with a valid value | the save is accepted |

### Scenario (refusal): A save for a missing field or revision is stale
| Save received | Answer (the document is unchanged) |
| --- | --- |
| a field name absent from the current analysis | "The frontmatter field is stale or its value does not match the schema." |
| a document revision that differs from the revision of the document | the same stale-field message |
| an add of a name that already exists | the same stale-field message |

### Known issues
- Known issue: the stale-field message is shared by a stale render, a missing field, an add of an existing name and a type mismatch; the user cannot tell them apart.

### Related requirements
- SwRS-MDOKFSTUDIO-FMEDIT-067: a flush save skips the YAML, type and schema checks.
- SwRS-MDOKFSTUDIO-FMEDIT-024: the refusal of a rename to a used or invalid name.
- SwRS-MDOKFSTUDIO-FMEDIT-029: the refusal to remove a required field.

### Verification notes
- Method: test/core/edits/frontmatterEdit.test.ts (scenarios: YAML that does not parse, empty or non-text value, value that does not fit the field type, accepted values, schema error on the edited field, only errors of the edited field block a save, stale field; texts, dates and times must be strings, booleans booleans, numbers finite, lists arrays; conditional (if/then) rules apply through the analysis of the candidate text; only the edited field's issues with origin other than link are considered).
- Method: test/integration/previewEditing.test.ts (scenarios: schema error on the edited field, a conditional rule forbids null and the save is refused; the candidate document is analysed again with its conditional rules).
- Method: inspection of currentPreviewDocument (scenario: a stale document revision gets the stale-field message).
- Criteria: the host re-checks every save whatever the page sent; a refusal changes nothing and is shown in the field editor.
