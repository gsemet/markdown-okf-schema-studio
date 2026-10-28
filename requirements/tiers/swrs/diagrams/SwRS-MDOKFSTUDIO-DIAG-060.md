---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-060
uuid: d4fca3a4-06dc-4477-bd8b-304ed55be01b
title: "A symlink leaving the allowed folders is refused"
description: "When an include file is a symbolic link whose target lies outside the
  allowed folders, the host SHALL refuse it with the reason that the file is outside
  the folders the preview reads."
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-009
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-054; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-DIAG-054
default_owner_email: gaetan@xeberon.net
---

## A symlink leaving the allowed folders is refused

### Normative behavior

When an include file is a symbolic link whose target lies outside the allowed folders, the host SHALL refuse it with the reason that the file is outside the folders the preview reads.

### Scenario: Escaping link

- GIVEN a symbolic link in the document's folder that points outside the workspace
- WHEN the host resolves an include of it
- THEN it is refused with the outside-folders reason

### Scenario: Link inside

- GIVEN a symbolic link whose target stays inside the allowed folders
- WHEN the host resolves an include of it
- THEN the file is served

### Verification notes

- Method: Unit test: a missing file is refused and watched, a too large file and a symlink escape are refused (test/core/render/plantUmlIncludes.test.ts).
- Criteria: Links are judged by their real path.
