---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-156
uuid: 31d75948-1869-435a-bacd-2922a051d51c
title: The settings editor lists the Studio settings in titled groups
description: The extension SHALL contribute exactly the settings of its settings
  registry, with their schema text and defaults generated into package.json, in
  the groups Preview, Editing, Frontmatter, Comments and PlantUML in that order,
  each setting with a unique order and a markdownDescription of at most 700
  characters, reading a setting with nothing stored, and an absent or wrongly
  typed boot entry of the page, as its default.
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-021
depends_on: []
scenarios:
- id: S1
  title: Group order and key prefix
- id: S2
  title: Descriptions, order and sorting
- id: S3
  title: Description limit
- id: S4
  title: Generated schema
- id: S5
  title: Setting read
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/configuration/previewConfiguration.ts
- src/core/configuration/settingsRegistry.ts
- src/page/bootContext.ts
tested_in_files:
- test/core/configuration/settingsRegistry.test.ts
- test/page/pageSettings.test.ts
- test/security/package-contract.test.ts
default_owner_email: gaetan@xeberon.net
---

## The settings editor lists the Studio settings in titled groups

### Normative behavior

The extension SHALL contribute exactly the settings of its settings registry, with their schema text and defaults generated into package.json, in the groups Preview, Editing, Frontmatter, Comments and PlantUML in that order, each setting with a unique order and a markdownDescription of at most 700 characters, reading a setting with nothing stored, and an absent or wrongly typed boot entry of the page, as its default.

### Scenario S1 (nominal): Group order and key prefix

- GIVEN the package manifest
- WHEN the configuration is read
- THEN the groups are Preview 1, Editing 2, Frontmatter 3, Comments 4 and PlantUML 5, and no group Opening Files nor any setting whose key starts with markdownOkfSchemaStudio.open.
- AND a setting named markdownOkfSchemaStudio.comments.authorName sits in the Comments group, because every setting is in the group of its key prefix

### Scenario S2 (nominal): Descriptions, order and sorting

- GIVEN the package manifest
- WHEN each setting is read
- THEN it has a non-empty markdownDescription and an order no other setting has
- AND the settings of one group are listed following their order values

### Scenario S3 (boundary): Description limit

| Setting description | Outcome |
| --- | --- |
| A markdownDescription of at most 700 characters and no description key | Accepted |
| A markdownDescription of 701 characters | The contract test fails |

### Scenario S4 (refusal): Generated schema

| Registry and package.json | Outcome |
| --- | --- |
| In sync | The generated schema equals the contributed one byte for byte |
| A setting edited by hand in package.json | The check fails, because the schema differs from the generated one |

### Scenario S5 (nominal): Setting read

| Stored value | Outcome |
| --- | --- |
| No value for scrollPreviewWithEditor | The value is true, the schema default |
| A stored value for the same setting | The stored value is read, normalized by the setting's own rule |

### Verification notes

- Internal scenarios (moved from the scenarios, not observable by the reader): (a) Boot context written by the host: for a configuration with the scroll, reveal and sticky band settings, the host writes the boot context with the entries under their own names, in table order; the maxContentWidth and incrementalUpdates settings are not part of it, because the host applies them itself. (b) Boot context read by the page: missing entries, and a string where a boolean is expected, give each setting its page default (scroll and reveal on, selection mark off); a default-on flag with a value other than false reads as on; a boot element that is empty, is not valid JSON, or holds null, an array or a primitive gives an empty boot context, every entry reads as its page default, and no error is thrown.
- Method: test/core/configuration/settingsRegistry.test.ts "categories keep their titles and order, and settings are sorted by their order" (group order, sorting), "the generated settings schema is the package.json one, byte for byte" (generated schema; the hand-edit row follows from the same comparison, and the scripts are just generate-settings and just check-settings), "a setting with nothing stored reads as its schema default" (setting read), "the host writes the boot settings as configured, in table order" and "the page gets the scroll, reveal, sticky band and comment chip settings in its boot context" (boot context written), "the page reads missing or odd boot entries with the page defaults" (boot context read).
- Method: test/security/package-contract.test.ts "contributes only opt-in Markdown OKF-Schema Studio commands" (key prefix) and "every contributed setting is explained with a markdownDescription and a unique order" (descriptions and order, description limit).
- Method: test/page/bootContext.test.ts "the boot context reads a JSON object and falls back to an empty one for anything else" (a boot element that is not a JSON object).
- Method: test/page/pageSettings.test.ts "page settings default to following both ways, and without selection marks" (boot context read).
- Criteria: the configuration array equals the registry's categories; no two orders are equal and each group is ascending; each markdownDescription has at most 700 characters; the two JSON texts are equal; readSetting returns the schema default for an unset key; previewBootSettings returns only the settings that have a boot entry; readPreviewBootSettings applies the flag rule of each setting.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-021](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-021.md): The settings editor lists the Studio settings in clear groups
<!-- okf:links:end -->
