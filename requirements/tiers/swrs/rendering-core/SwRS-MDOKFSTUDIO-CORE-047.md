---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-047
uuid: fcc7bbf2-04ac-4bd3-b885-ca1c17341fe3
title: Show a citation as an unresolved placeholder
description: When a document holds a `{cite}` role, the extension SHALL render
  an unresolved citation placeholder without appending a bibliography.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-003
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

## Show a citation as an unresolved placeholder

### Normative behavior

When a document holds a `{cite}` role, the extension SHALL render an unresolved citation placeholder without appending a bibliography.

### Scenario: Nominal show a citation as an unresolved placeholder

- GIVEN a `{cite}` to a key
- WHEN it is rendered
- THEN an inert citation placeholder shows

### Scenario: Boundary or refusal of show a citation as an unresolved placeholder

- GIVEN a document without a `{bibliography}`
- WHEN it is rendered
- THEN no bibliography is appended

### Verification notes

- Method: Unit test "T30: a {cite} inserted by the edition palette renders the citation placeholder" in test/core/render/mystPaletteRendering.test.ts; Unit test "project-scoped roles and directives degrade to labelled placeholders" in test/core/render/mystFeatures.test.ts
- Criteria: A citation yields a placeholder and no added section.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-003](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-003.md): A reader sees what cannot be rendered and keeps a usable preview
  - [StRS-MDOKFSTUDIO-MYST-005](../../strs/myst/StRS-MDOKFSTUDIO-MYST-005.md): Build-dependent constructs appear as labelled placeholders
- Superseded by:
  - [SwRS-MDOKFSTUDIO-CORE-022](SwRS-MDOKFSTUDIO-CORE-022.md): Build-dependent constructs show an inert placeholder with a warning
<!-- okf:links:end -->
