---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-275
uuid: 09728e8d-5639-4abc-8348-56d1ad7b7555
title: Select all and copy gives the whole source exactly
description: When the writer selects the whole page and copies, the page SHALL
  put on the clipboard the whole source text exactly, including the frontmatter,
  trailing link definitions and comments and the final line break.
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
- src/core/mapping/rawCopy.ts
tested_in_files:
- test/core/mapping/rawCopy.test.ts
- test/integration/realInput/rawCopy.ts
- test/visual/rawCopyScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## Select all and copy gives the whole source exactly

### Normative behavior

When the writer selects the whole page and copies, the page SHALL put on the clipboard the whole source text exactly, including the frontmatter, trailing link definitions and comments and the final line break.

### Scenario S1: nominal

- GIVEN a Select all of the page
- WHEN the copy is taken
- THEN the text/plain is the whole source text

### Scenario S2: boundary

- GIVEN a range that ends at the start of the next block
- WHEN the copy is taken
- THEN the next block is not part of the copy

### Verification notes

- Method: unit tests of the core; visual capture
- Criteria: the whole source is copied, no more

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-027](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-027.md): A reader copies a selection as the exact Markdown under it
<!-- okf:links:end -->
