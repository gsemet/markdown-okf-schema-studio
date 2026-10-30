---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-124
uuid: 06806869-6440-4413-9022-57104170bb28
title: Collapsible wraps the touched lines in a details element with a summary
description: When the writer presses Collapsible, the extension SHALL wrap the
  touched lines, or a sample content, in a details element with a summary,
  select the summary text and leave a blank line after the summary.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/blockEditActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
default_owner_email: gaetan@xeberon.net
---

## Collapsible wraps the touched lines in a details element with a summary

### Normative behavior

When the writer presses Collapsible, the extension SHALL wrap the touched lines, or a sample content, in a details element with a summary, select the summary text and leave a blank line after the summary.

### Scenario (nominal): Sample

- GIVEN the caret in a paragraph
- WHEN Collapsible is pressed
- THEN a details block with the summary Summary and the content Content is inserted after the paragraph, set apart by blank lines, with Summary selected

### Scenario (boundary): Selection

- GIVEN two selected lines
- WHEN Collapsible is pressed
- THEN the lines become the content of the details element and Summary is selected

### Verification notes

- Method: test/page/modules/editActions.test.ts (T26: details inserts a collapsible sample after the selection, summary selected; details wraps the touched lines and keeps them as content; scenarios sample, selection)
- Criteria: The blank line after the summary makes the content render as Markdown.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-001](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-001.md): A writer formats and inserts Markdown, GFM and MyST constructs from the palette
<!-- okf:links:end -->
