---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-084
uuid: 2ffda814-d16a-4a67-ac30-5c20aa41ffbb
title: Every schema violation is reported on its field or in a row of its own
description: When the frontmatter is validated against its schema, the extension
  SHALL apply the keywords of JSON Schema 2020-12 with formats and report every
  violation, on the row of the field concerned when it names one and in a row of
  its own otherwise.
project: markdown-okf-schema-studio
scope: frontmatter-schema
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-005
- StRS-MDOKFSTUDIO-FMSCHEMA-010
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/frontmatter/frontmatterValidate.ts
- src/core/frontmatter/okfFrontmatter.ts
- src/core/frontmatter/propertiesTable.ts
- src/core/frontmatter/schemaValidator.ts
tested_in_files:
- test/core/frontmatter/okfFrontmatter.test.ts
- test/core/frontmatter/propertiesTable.test.ts
- test/integration/previewEditing.test.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-FMEDIT-086
- SwRS-MDOKFSTUDIO-FMSCHEMA-035
- SwRS-MDOKFSTUDIO-FMSCHEMA-036
- SwRS-MDOKFSTUDIO-FMSCHEMA-037
- SwRS-MDOKFSTUDIO-FMSCHEMA-041
- SwRS-MDOKFSTUDIO-FMSCHEMA-042
- SwRS-MDOKFSTUDIO-FMSCHEMA-089
---

## Every schema violation is reported on its field or in a row of its own

### Normative behavior

When the frontmatter is validated against its schema, the extension SHALL apply the keywords of JSON Schema 2020-12 with formats and report every violation, on the row of the field concerned when it names one and in a row of its own otherwise.

### Scenario (nominal): Violations mark their field rows

- GIVEN a schema with a number maximum 5 and a date-time format, and a document with values 9 and x for those fields
- WHEN the preview is rendered
- THEN both rows are underlined in red, every violation is reported (not only the first) and their tooltips read must be <= 5 and must match format "date-time"

### Scenario (nominal): 2020-12 keywords and formats

| Input | Outcome |
| --- | --- |
| a schema using prefixItems with items false and a list value whose second item has the wrong type | the list row carries the error must be number |
| a schema property with a format and a value that does not match it | the row carries the format error |

### Scenario (nominal): Missing required field

- GIVEN a schema requiring title and a document without title
- WHEN the preview is rendered
- THEN a row named title with an empty value is listed last and carries the error Required field "title" is missing.

### Scenario (nominal): Whole-document error

- GIVEN a schema with minProperties 3 and a document with the single key type
- WHEN the preview is rendered
- THEN a red row reads must NOT have fewer than 3 properties and the badge reads 1 error

### Scenario (nominal): Closed schema

- GIVEN a schema with additionalProperties false declaring type and a, and a document that also sets zz
- WHEN the preview is rendered
- THEN one error row reads must NOT have additional properties, whatever the strict setting
- AND the properties section carries data-okf-additional-properties="false"

### Scenario (nominal): Strict setting

- GIVEN `markdownOkfSchemaStudio.frontmatter.strictAdditionalProperties` true, a schema declaring type and title, and a document that also sets titel
- WHEN the preview is rendered
- THEN the row titel carries the warning "Unknown field; it is not declared in the "{type}" schema." and the badge counts one warning

### Scenario (boundary): Cases without an issue

| Input | Outcome |
| --- | --- |
| a schema with a number maximum 5 and a date-time format, and values 3 and 2026-01-01T00:00:00Z | no row is underlined and no badge is shown |
| a document violating one constraint | exactly one row carries an error |
| a schema requiring title and a document with a title | no row carries a required-field error |
| a schema with minProperties 3 and a document with three keys | no whole-document row is shown |
| a schema without additionalProperties false | no "must NOT have additional properties" row appears |
| a schema root that allows additional properties, or one that does not state it | the properties section has no data-okf-additional-properties attribute |
| strictAdditionalProperties unset (default false, boolean) | titel is listed without any warning |

### Known issues

- Known issue: messages are not translated and unknown schema keywords are ignored without notice.
- Known issue: the "must NOT have additional properties" error is not attached to the field row (the validator reports it at the document root), so the undeclared row itself carries no underline.

### Related requirements

- SwRS-MDOKFSTUDIO-FMEDIT-028: the field action menu reads the data-okf-additional-properties flag and then lists no "Custom key..." entry.

### Verification notes

- Method: test/core/frontmatter/okfFrontmatter.test.ts (violations mark their field rows; 2020-12 keywords and formats, probed against the analysis; missing required field; closed schema; strict setting; cases without an issue).
- Method: test/core/frontmatter/propertiesTable.test.ts, test T25 `the section flags a schema that forbids additional properties` (closed schema, section flag; cases without an issue, flag absent).
- Method: test/integration/previewEditing.test.ts (closed schema).
- Method: test/visual/scenarioDefinitions2.ts, visual scenario (strict setting).
- Criteria: Messages are the English texts of the validator; unknown schema keywords are ignored silently. The validator collects all errors, so each violation gets its own row or underline. The empty required row has value null and is flagged required. The whole-document row is an info-style row with the error severity and spans every visible column. The strict setting has no effect on the closed-schema error; one row is reported per undeclared key, including type when the schema does not declare it. The strict warning applies only when a schema matched, is independent of the schema's own additionalProperties, and a generic table never warns. The whole-document scenario (minProperties) has no test (probed against the analysis).

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMEDIT-005](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-005.md): A writer adds, renames and removes metadata fields
  - [StRS-MDOKFSTUDIO-FMSCHEMA-010](../../strs/frontmatter-schema/StRS-MDOKFSTUDIO-FMSCHEMA-010.md): Fields follow the schema and problems show on the field concerned
- Supersedes:
  - [SwRS-MDOKFSTUDIO-FMEDIT-086](../frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-086.md): A closed schema flags the properties section
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-035](SwRS-MDOKFSTUDIO-FMSCHEMA-035.md): A schema error marks the row of its field
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-036](SwRS-MDOKFSTUDIO-FMSCHEMA-036.md): A missing required field gets an empty row with its error
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-037](SwRS-MDOKFSTUDIO-FMSCHEMA-037.md): An error that names no field becomes a red row of its own
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-041](SwRS-MDOKFSTUDIO-FMSCHEMA-041.md): A closed schema reports every undeclared field
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-042](SwRS-MDOKFSTUDIO-FMSCHEMA-042.md): The strict setting warns on undeclared fields
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-089](SwRS-MDOKFSTUDIO-FMSCHEMA-089.md): Every violation of the schema is reported
<!-- okf:links:end -->
