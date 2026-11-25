---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-277
uuid: c6973fa9-320e-47f2-bc6a-e6c35c8a676c
title: The raw copy puts Markdown as plain text and the rendered selection as
  HTML
description: When the page takes a copy, it SHALL set the clipboard's text/plain
  to the raw Markdown of the selection and its text/html to the rendered HTML of
  the selection without chrome, and prevent the browser's own copy.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-027
scenarios:
- id: S1
  title: nominal
- id: S2
  title: boundary
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/rawCopy.ts
tested_in_files:
- test/page/runtimeRawCopy.test.ts
- test/visual/rawCopyScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## The raw copy puts Markdown as plain text and the rendered selection as HTML

### Normative behavior

When the page takes a copy, it SHALL set the clipboard's text/plain to the raw Markdown of the selection and its text/html to the rendered HTML of the selection without chrome, and prevent the browser's own copy.

### Scenario S1: nominal

- GIVEN a taken copy
- WHEN the page sets the clipboard
- THEN text/plain holds the raw Markdown, text/html the rendered selection without chrome

### Scenario S2: boundary

- GIVEN the copy event carries no clipboard data
- WHEN the copy is taken
- THEN the page does nothing and the browser's copy runs

### Verification notes

- Method: unit tests of the page; real VS Code input test
- Criteria: both formats are set and the native copy is cancelled

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-027](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-027.md): A reader copies a selection as the exact Markdown under it
<!-- okf:links:end -->
