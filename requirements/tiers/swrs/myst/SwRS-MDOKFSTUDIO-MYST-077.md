---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-077
uuid: 4d728116-fddf-4f50-a0d2-b6617f901e78
title: Extension warnings use the fixed wording and status list
description: "When an extension is missing, the extension SHALL list one warning in
  the status area as file:line: message, severity warning and code myst-extension,
  reading, with SYNTAX the used syntax and EXTENSION the missing extension: `SYNTAX`
  is used but this needs the MyST extension `EXTENSION`, which is not enabled in your
  conf.py. Add \"EXTENSION\" to `myst_enable_extensions`. Rendering stays unchanged."
project: markdown-okf-schema-studio
scope: myst
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-072; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-MYST-072
default_owner_email: gaetan@xeberon.net
---

## Extension warnings use the fixed wording and status list

### Normative behavior

When an extension is missing, the extension SHALL list one warning in the status area as file:line: message, severity warning and code myst-extension, reading, with SYNTAX the used syntax and EXTENSION the missing extension: `SYNTAX` is used but this needs the MyST extension `EXTENSION`, which is not enabled in your conf.py. Add "EXTENSION" to `myst_enable_extensions`. Rendering stays unchanged.

### Scenario: Nominal

- GIVEN a missing dollarmath
- WHEN the preview renders
- THEN the status area lists file:line: message with that wording and code myst-extension

### Scenario: Boundary or refusal

- GIVEN another render diagnostic
- WHEN the preview renders
- THEN it is coded myst-diagnostic

### Verification notes

- Method: Unit test "CR 050: the status region marks the conf.py warnings with their code" in test/page/modules/warningBanner.test.ts; Unit test "MyST syntax missing from the nearest conf.py warns once per extension, rendering unchanged" in test/core/render/renderPipeline.test.ts
- Criteria: The wording is fixed.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-007](../../strs/myst/StRS-MDOKFSTUDIO-MYST-007.md): Sphinx configuration gaps are reported before building
- Superseded by:
  - [SwRS-MDOKFSTUDIO-MYST-072](SwRS-MDOKFSTUDIO-MYST-072.md): MyST syntax of a disabled extension is reported with its line
<!-- okf:links:end -->
