---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-086
uuid: a98b68ba-9911-4c07-b2c2-9208f62df365
title: In Restricted Mode the banner lists warnings in its tooltip
description: When the workspace is untrusted, the extension SHALL not publish
  warnings to the Problems view and show the banner without Open Problems,
  listing the warnings in its tooltip, with the close button kept.
project: markdown-okf-schema-studio
scope: myst
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-081; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-MYST-081
default_owner_email: gaetan@xeberon.net
---

## In Restricted Mode the banner lists warnings in its tooltip

### Normative behavior

When the workspace is untrusted, the extension SHALL not publish warnings to the Problems view and show the banner without Open Problems, listing the warnings in its tooltip, with the close button kept.

### Scenario: Nominal

- GIVEN an untrusted workspace
- WHEN the preview renders
- THEN no Open Problems button and the tooltip lists the lines

### Scenario: Boundary or refusal

- GIVEN the close button
- WHEN it is activated
- THEN the banner closes

### Verification notes

- Method: Unit test "CR 050: in Restricted Mode the banner has no Problems button and lists the warnings in its tooltip" in test/page/modules/warningBanner.test.ts; Integration suite run() in test/integration/mystDiagnostics.test.ts
- Criteria: Standalone variant has no assertion.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-007](../../strs/myst/StRS-MDOKFSTUDIO-MYST-007.md): Sphinx configuration gaps are reported before building
- Superseded by:
  - [SwRS-MDOKFSTUDIO-MYST-081](SwRS-MDOKFSTUDIO-MYST-081.md): A closable banner announces conf.py warnings
<!-- okf:links:end -->
