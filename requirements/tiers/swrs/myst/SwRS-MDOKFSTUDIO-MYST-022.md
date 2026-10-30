---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-022
uuid: a013881f-4c90-4744-9be2-8307df192252
title: The bibliography directive explains build-time resolution
description: When a document holds a `{bibliography}` directive, the extension
  SHALL show a placeholder saying Bibliography resolves at build time.
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

## The bibliography directive explains build-time resolution

### Normative behavior

When a document holds a `{bibliography}` directive, the extension SHALL show a placeholder saying Bibliography resolves at build time.

### Scenario: Nominal

- GIVEN a `{bibliography}` directive
- WHEN the preview renders
- THEN the placeholder says Bibliography resolves at build time

### Scenario: Boundary or refusal

- GIVEN a document without the directive
- WHEN the preview renders
- THEN no such note is shown

### Verification notes

- Method: Visual scenario unresolved-dark-full in test/visual/scenarioDefinitions1.ts
- Criteria: The text is exact.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-005](../../strs/myst/StRS-MDOKFSTUDIO-MYST-005.md): Build-dependent constructs appear as labelled placeholders
- Superseded by:
  - [SwRS-MDOKFSTUDIO-CORE-022](../rendering-core/SwRS-MDOKFSTUDIO-CORE-022.md): Build-dependent constructs show an inert placeholder with a warning
<!-- okf:links:end -->
