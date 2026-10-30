---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-023
uuid: c8683b18-9d80-46cf-adb0-350559459b90
title: Notebook output references show a note and a warning
description: When a document holds a notebook output reference such as `#tbl:`
  or an unexecuted `{code-cell}` output, the extension SHALL show a note and a
  warning.
project: markdown-okf-schema-studio
scope: myst
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-005
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CORE-022; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-CORE-022
default_owner_email: gaetan@xeberon.net
---

## Notebook output references show a note and a warning

### Normative behavior

When a document holds a notebook output reference such as `#tbl:` or an unexecuted `{code-cell}` output, the extension SHALL show a note and a warning.

### Scenario: Nominal

- GIVEN an unexecuted `{code-cell}` output
- WHEN the preview renders
- THEN a note and a warning are shown

### Scenario: Boundary or refusal

- GIVEN a `#tbl:` notebook output reference
- WHEN the preview renders
- THEN a note and a warning are shown

### Verification notes

- Method: Unit test "MyST code-cell directives render numbered input without claiming execution" in test/core/render/mystFeatures.test.ts
- Criteria: Both cases are warned.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-005](../../strs/myst/StRS-MDOKFSTUDIO-MYST-005.md): Build-dependent constructs appear as labelled placeholders
- Superseded by:
  - [SwRS-MDOKFSTUDIO-CORE-022](../rendering-core/SwRS-MDOKFSTUDIO-CORE-022.md): Build-dependent constructs show an inert placeholder with a warning
<!-- okf:links:end -->
