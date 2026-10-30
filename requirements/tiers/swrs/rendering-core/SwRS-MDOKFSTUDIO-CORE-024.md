---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-024
uuid: d5466ea6-31bd-4913-9d02-8cc7b94ddf59
title: List diagnostics with file, line and severity
description: 'When a render yields diagnostics, the extension SHALL list each in the
  status region as a file, a line and a message with a severity.'
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-003
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CORE-025; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-CORE-025
default_owner_email: gaetan@xeberon.net
---

## List diagnostics with file, line and severity

### Normative behavior

When a render yields diagnostics, the extension SHALL list each in the status region as a file, a line and a message with a severity.

### Scenario: Nominal list diagnostics with file, line and severity

- GIVEN a render with one warning on line 3
- WHEN it is displayed
- THEN the status region shows the file, line 3 and the message with the warning severity

### Scenario: Boundary or refusal of list diagnostics with file, line and severity

- GIVEN a render without diagnostics
- WHEN it is displayed
- THEN the diagnostic list is empty

### Verification notes

- Method: Unit test "T34: the patch rebuilds the status region from plain text" in test/page/runtimeContentPatch.test.ts; Unit test "the render pipeline retains buffer identity and attaches source diagnostics" in test/core/render/renderPipeline.test.ts
- Criteria: Each listed item shows file, line, message and severity.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-003](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-003.md): A reader sees what cannot be rendered and keeps a usable preview
- Superseded by:
  - [SwRS-MDOKFSTUDIO-CORE-025](SwRS-MDOKFSTUDIO-CORE-025.md): A failed render keeps the previous page and lists its diagnostics
<!-- okf:links:end -->
