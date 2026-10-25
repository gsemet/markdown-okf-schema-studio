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
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-021
- StRS-MDOKFSTUDIO-LIFE-010
- StRS-MDOKFSTUDIO-LIFE-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/configuration/previewConfiguration.ts
- src/core/configuration/settingsRegistry.ts
tested_in_files:
- test/core/configuration/settingsRegistry.test.ts
- test/page/pageSettings.test.ts
- test/security/package-contract.test.ts
---

## The settings editor lists the Studio settings in titled groups

### Normative behavior

The extension SHALL contribute exactly the settings of its settings registry, with their schema text and defaults generated into package.json, in the groups Preview, Editing, Frontmatter, Comments and PlantUML in that order, each setting with a unique order and a markdownDescription of at most 700 characters, reading a setting with nothing stored, and an absent or wrongly typed boot entry of the page, as its default.

### Scenario (nominal): Group order and key prefix

- GIVEN the package manifest
- WHEN the configuration is read
- THEN the groups are Preview 1, Editing 2, Frontmatter 3, Comments 4 and PlantUML 5
- AND a setting named markdownOkfSchemaStudio.comments.authorName sits in the Comments group, because every setting is in the group of its key prefix

### Scenario (nominal): Descriptions, order and sorting

- GIVEN the package manifest
- WHEN each setting is read
- THEN it has a non-empty markdownDescription and an order no other setting has
- AND the settings of one group are listed following their order values

### Scenario (boundary): Description limit

| Setting description | Outcome |
| --- | --- |
| A markdownDescription of at most 700 characters and no description key | Accepted |
| A markdownDescription of 701 characters | The contract test fails |

### Scenario (refusal): Generated schema

| Registry and package.json | Outcome |
| --- | --- |
| In sync | The generated schema equals the contributed one byte for byte |
| A setting edited by hand in package.json | The check fails, because the schema differs from the generated one |

### Scenario (nominal): Setting read

| Stored value | Outcome |
| --- | --- |
| No value for scrollPreviewWithEditor | The value is true, the schema default |
| A stored value for the same setting | The stored value is read, normalized by the setting's own rule |

### Scenario (nominal): Boot context written by the host

- GIVEN a configuration with the scroll, reveal and sticky band settings
- WHEN the host builds a page and writes the boot context
- THEN the entries carry the configured values under their own names, in table order
- AND the maxContentWidth and incrementalUpdates settings are not part of it, because the host applies them itself

### Scenario (boundary): Boot context read by the page

| Boot context | Outcome |
| --- | --- |
| Missing entries, and a string where a boolean is expected | Each setting gets its page default: scroll and reveal on, selection mark and double click off |
| A default-on flag with a value other than false | It reads as on |

### Verification notes

- Method: test/core/configuration/settingsRegistry.test.ts "categories keep their titles and order, and settings are sorted by their order" (group order, sorting), "the generated settings schema is the package.json one, byte for byte" (generated schema; the hand-edit row follows from the same comparison, and the scripts are just generate-settings and just check-settings), "a setting with nothing stored reads as its schema default" (setting read), "the host writes the boot settings as configured, in table order" and "the page gets the scroll, reveal, sticky band and comment chip settings in its boot context" (boot context written), "the page reads missing or odd boot entries with the page defaults" (boot context read).
- Method: test/security/package-contract.test.ts "contributes only opt-in Markdown OKF-Schema Studio commands" (key prefix) and "every contributed setting is explained with a markdownDescription and a unique order" (descriptions and order, description limit).
- Method: test/page/pageSettings.test.ts "page settings default to following both ways, without selection marks or double-click reveal" (boot context read).
- Criteria: the configuration array equals the registry's categories; no two orders are equal and each group is ascending; each markdownDescription has at most 700 characters; the two JSON texts are equal; readSetting returns the schema default for an unset key; previewBootSettings returns only the settings that have a boot entry; readPreviewBootSettings applies the flag rule of each setting.
