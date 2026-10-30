---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-083
uuid: 0856f288-e093-48e3-8080-26948a720fe8
title: Open Problems opens the Problems view
description: When the reader activates Open Problems on the banner, the
  extension SHALL open the host's Problems view, also for read-only and
  untrusted previews.
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

## Open Problems opens the Problems view

### Normative behavior

When the reader activates Open Problems on the banner, the extension SHALL open the host's Problems view, also for read-only and untrusted previews.

### Scenario: Nominal

- GIVEN a trusted preview
- WHEN the button is activated
- THEN the Problems view opens

### Scenario: Boundary or refusal

- GIVEN a read-only or untrusted preview
- WHEN the button is activated
- THEN the request is allowed since it edits nothing

### Verification notes

- Method: Unit test "CR 050: Open Problems asks the host to open the Problems view" in test/page/modules/warningBanner.test.ts
- Criteria: The message carries only the envelope and passes the document gate.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-007](../../strs/myst/StRS-MDOKFSTUDIO-MYST-007.md): Sphinx configuration gaps are reported before building
- Superseded by:
  - [SwRS-MDOKFSTUDIO-MYST-081](SwRS-MDOKFSTUDIO-MYST-081.md): A closable banner announces conf.py warnings
<!-- okf:links:end -->
