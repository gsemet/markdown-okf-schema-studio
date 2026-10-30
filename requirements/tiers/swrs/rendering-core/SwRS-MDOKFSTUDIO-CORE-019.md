---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-019
uuid: 5d364a81-a1b8-4bfe-a269-f3a22123bad5
title: Warn about a missing included file
description: When an include names a file that does not exist, the extension
  SHALL list a warning naming the request in the status region.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-002
- StRS-MDOKFSTUDIO-CORE-003
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CORE-013; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-CORE-013
default_owner_email: gaetan@xeberon.net
---

## Warn about a missing included file

### Normative behavior

When an include names a file that does not exist, the extension SHALL list a warning naming the request in the status region.

### Scenario: Nominal warn about a missing included file

- GIVEN an include of `missing.md`
- WHEN it is rendered
- THEN a warning for `missing.md` is listed in the status region

### Scenario: Boundary or refusal of warn about a missing included file

- GIVEN the file is created and the document re-rendered
- WHEN it is rendered
- THEN the warning disappears and the content is expanded

### Verification notes

- Method: Integration suite run() in test/integration/projectFeatures.test.ts
- Criteria: The warning appears while the file is missing and not after.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-002](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-002.md): A writer composes a document from included files
  - [StRS-MDOKFSTUDIO-CORE-003](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-003.md): A reader sees what cannot be rendered and keeps a usable preview
- Superseded by:
  - [SwRS-MDOKFSTUDIO-CORE-013](SwRS-MDOKFSTUDIO-CORE-013.md): Includes are bounded by depth, budget, size and allowed roots
<!-- okf:links:end -->
