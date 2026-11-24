---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-278
uuid: 23f17ccc-cf7b-4b5a-9f72-4d9d7023cee0
title: The raw copy balances its edges only when the opt-in setting is on
description: When the writer sets
  markdownOkfSchemaStudio.preview.rawCopy.balanceEdges to true, the page SHALL
  read it once at startup from the boot context and have the raw copy balance
  the edges of a selection, and with the setting off, unset or not a boolean the
  raw copy SHALL cut the source verbatim between the two edges.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-027
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/configuration/settingsRegistry.ts
- src/page/features/rawCopy.ts
tested_in_files:
- test/core/configuration/previewConfiguration.test.ts
- test/core/configuration/settingsRegistry.test.ts
- test/integration/realInput/rawCopy.ts
- test/page/runtimeRawCopy.test.ts
- test/visual/capture_raw_copy_balanced.py
- test/visual/rawCopyScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## The raw copy balances its edges only when the opt-in setting is on

### Normative behavior

When the writer sets markdownOkfSchemaStudio.preview.rawCopy.balanceEdges to true, the page SHALL read it once at startup from the boot context and have the raw copy balance the edges of a selection, and with the setting off, unset or not a boolean the raw copy SHALL cut the source verbatim between the two edges.

### Scenario: setting off

- GIVEN the setting is off, unset or not a boolean, and the text `Hello **world** again`
- WHEN the reader selects from the `r` of `world` to the end of the line and copies
- THEN the clipboard holds `rld** again`, the source verbatim

### Scenario: setting on, inside one construct

- GIVEN the setting is on in the boot context of the page
- WHEN the reader selects from the `o` to the `l` of `world` and copies
- THEN the clipboard holds `orl`

### Scenario: setting on, boundary crossed at the start

- GIVEN the setting is on
- WHEN the reader selects from the `r` of `world` to the end of the line and copies
- THEN the clipboard holds `**rld** again`

### Verification notes

<!-- Name the verification method, evidence, and boundaries. Do not claim
     coverage until implementation and test markers exist. -->

- Method: unit tests of the core and of the page; visual capture check; real VS Code input test
- Criteria: the same selection copies verbatim with the setting off and balanced with it on

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-027](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-027.md): A reader copies a selection as the exact Markdown under it
<!-- okf:links:end -->
