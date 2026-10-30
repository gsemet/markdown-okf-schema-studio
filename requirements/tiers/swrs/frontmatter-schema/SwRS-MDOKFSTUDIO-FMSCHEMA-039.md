---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-039
uuid: fe2a1096-0c48-4140-95d7-f0464073fac5
title: The title badge counts the issues and jumps to the first one
description: When the frontmatter has errors or warnings, the extension SHALL
  show in the table title a badge button with the count of errors then the count
  of warnings (the count of infos when there is neither), which scrolls to the
  first row with an issue when pressed, together with a red line under the table
  that names the missing required fields.
project: markdown-okf-schema-studio
scope: frontmatter-schema
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-010
- StRS-MDOKFSTUDIO-FMSCHEMA-014
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/frontmatter/frontmatterValidate.ts
- src/core/frontmatter/okfFrontmatter.ts
- src/core/frontmatter/propertiesTable.ts
- src/page/features/pageInput.ts
tested_in_files:
- test/core/frontmatter/diagReq.frontmatter.requirements.test.ts
- test/core/frontmatter/okfFrontmatter.test.ts
- test/core/frontmatter/propertiesTable.test.ts
- test/integration/realInput/markers.ts
- test/page/runtimeScroll.test.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-FMSCHEMA-038
- SwRS-MDOKFSTUDIO-FMSCHEMA-040
- SwRS-MDOKFSTUDIO-FMSCHEMA-085
- SwRS-MDOKFSTUDIO-FMSCHEMA-087
---

## The title badge counts the issues and jumps to the first one

### Normative behavior

When the frontmatter has errors or warnings, the extension SHALL show in the table title a badge button with the count of errors then the count of warnings (the count of infos when there is neither), which scrolls to the first row with an issue when pressed, together with a red line under the table that names the missing required fields.

### Scenario (nominal): Errors and warnings

- GIVEN a document with 1 error and 2 warnings
- WHEN the preview is rendered
- THEN the badge, a button labelled "Go to the first frontmatter issue", reads ✖ 1 ⚠ 2

### Scenario (boundary): Counts of the badge

| Input | Outcome |
| --- | --- |
| a document without any issue | no badge is shown |
| a document with only the no-schema info row | the badge reads ℹ 1 |
| a document with an error and an info row | the badge reads only the error count |

### Scenario (nominal): Jump to the issue

- GIVEN a long table whose third row has an error
- WHEN the writer presses the badge
- THEN the row is scrolled to the centre, its value cell has focus and the highlight attribute is removed after 1.5 s

### Scenario (refusal): Info rows only

- GIVEN a table whose only issue is the info row (no field row carries it)
- WHEN the writer presses the badge
- THEN nothing scrolls and nothing is highlighted

### Scenario (nominal): Missing required fields summary

- GIVEN a schema requiring title and owner and a document with neither
- WHEN the preview is rendered
- THEN a line under the table reads "Missing required fields: title, owner" and has role alert

### Scenario (boundary): No required field missing

- GIVEN a document with both fields
- WHEN the preview is rendered
- THEN no "Missing required fields" line is shown

### Scenario (nominal): Link problems count in the badge

| Input | Outcome |
| --- | --- |
| a link value nope.md that is not found | the field row carries the issue and the badge counts one error |
| a bundle-relative link without a bundle root | the badge counts one warning |

### Known issues

- Known issue: when only info rows carry issues the badge does nothing.

### Verification notes

- Method: test/core/frontmatter/propertiesTable.test.ts (errors and warnings, counts of the badge, missing required fields summary, link problems count in the badge).
- Method: test/core/frontmatter/okfFrontmatter.test.ts (missing required fields summary, analysis part).
- Method: test/core/frontmatter/diagReq.frontmatter.requirements.test.ts (counts of the badge: infos only, error and info).
- Method: test/integration/realInput/markers.ts and test/page/runtimeScroll.test.ts (jump to the issue, info rows only).
- Method: test/integration/realInput/markers.ts (link problems count in the badge).
- Method: test/visual/scenarioDefinitions2.ts, visual scenario (missing required fields summary).
- Criteria: The info count is shown only when errors and warnings are both zero. The first row carrying an error, warning or info class is chosen, in table order; its value cell is focused when the row has an editable value cell, otherwise its name cell. Missing names follow the order in which the effective schema collected its required lists. Link issues carry the origin link, which the field editor ignores when saving, so a link problem does not block the saving of other fields.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMSCHEMA-010](../../strs/frontmatter-schema/StRS-MDOKFSTUDIO-FMSCHEMA-010.md): Fields follow the schema and problems show on the field concerned
  - [StRS-MDOKFSTUDIO-FMSCHEMA-014](../../strs/frontmatter-schema/StRS-MDOKFSTUDIO-FMSCHEMA-014.md): Frontmatter link fields resolve, show their status and can be followed
- Supersedes:
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-038](SwRS-MDOKFSTUDIO-FMSCHEMA-038.md): Missing required fields are summarised under the table
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-040](SwRS-MDOKFSTUDIO-FMSCHEMA-040.md): The badge jumps to the first row with an issue
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-085](SwRS-MDOKFSTUDIO-FMSCHEMA-085.md): The badge counts infos only when there is no error or warning
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-087](SwRS-MDOKFSTUDIO-FMSCHEMA-087.md): A link problem counts in the badge
<!-- okf:links:end -->
