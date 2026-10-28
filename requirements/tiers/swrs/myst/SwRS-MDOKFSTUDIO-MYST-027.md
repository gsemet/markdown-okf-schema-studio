---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-027
uuid: 830777ab-1f99-4537-994b-cc40c5369bf9
title: Maths cannot run active content
description: When a formula uses `\href`, `\htmlStyle` or another trusted
  command, the extension SHALL refuse it with an error text and no link or
  style, and bound expansion and size.
project: markdown-okf-schema-studio
scope: myst
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-006
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-024; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-MYST-024
default_owner_email: gaetan@xeberon.net
---

## Maths cannot run active content

### Normative behavior

When a formula uses `\href`, `\htmlStyle` or another trusted command, the extension SHALL refuse it with an error text and no link or style, and bound expansion and size.

### Scenario: Nominal

- GIVEN a formula with `\href{...}{x}`
- WHEN the preview renders
- THEN error text is shown and no link exists

### Scenario: Boundary or refusal

- GIVEN a formula with `\htmlStyle` or a runaway macro
- WHEN the preview renders
- THEN no style is applied and expansion stays within 1000 and size within 100

### Verification notes

- Method: Unit test "math cannot inject trusted HTML commands or external links" in test/core/render/mathRenderer.test.ts
- Criteria: Trust is off and the bounds maxExpand 1000 and maxSize 100 are set.
