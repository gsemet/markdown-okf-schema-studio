---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-266
uuid: 67d10e20-e5f6-4e08-a7b5-6af9441a918d
title: Edit mode shows each blank run between top-level blocks, between list
  items or inside a list item as a blank-lines block
description: When edit mode is on, the extension SHALL show every run of two or
  more blank lines between top-level blocks, at the start or at the end of the
  body, between two items of a top-level list or inside a list item, as one
  blank-lines block placed from the host's run list, inside the list item that
  holds a run of a list, and show nothing for a single separator, a run inside
  another block (a fence, a directive, an HTML block, a table, a quote, an alert
  or an admonition), a run next to a folded block, a folded or included list,
  reading mode or the export.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-011
- StRS-MDOKFSTUDIO-BLOCK-025
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/mapping/blankRuns.ts
- src/core/mapping/blockRange.ts
- src/core/preview/styles/editModeStyles.ts
- src/core/render/renderPipeline.ts
- src/page/features/blankLines.ts
- src/page/features/blockSelectionView.ts
tested_in_files:
- test/core/export/htmlExport.test.ts
- test/core/mapping/blankRuns.test.ts
- test/core/render/blankRunsInLists.test.ts
- test/core/render/blankRunsList.test.ts
- test/page/runtimeBlankLines.test.ts
- test/visual/blankLinesBlockScenarios.ts
- test/visual/capture_blank_lines_block.py
default_owner_email: gaetan@xeberon.net
---

## Edit mode shows each blank run between top-level blocks as a blank-lines block

### Normative behavior

When edit mode is on, the extension SHALL show every run of two or more blank lines between top-level blocks, at the start or at the end of the body, between two items of a top-level list or inside a list item, as one blank-lines block placed from the host's run list, inside the list item that holds a run of a list, and show nothing for a single separator, a run inside another block (a fence, a directive, an HTML block, a table, a quote, an alert or an admonition), a run next to a folded block, a folded or included list, reading mode or the export.

### Scenario: Runs are shown

- GIVEN edit mode on and a source with two blank lines between two blocks, two at the start of the body and three at its end
- WHEN the content is rendered or patched
- THEN each run is one blank-lines block, placed after the insert point of the block above (or first, or before Start writing), with a label that gives the line count, and the host's hidden list of runs (data-okf-blank-runs) is the only source of the runs

### Scenario: Runs inside a list are shown

- GIVEN edit mode on and a top-level list with a run between two items and a run between two paragraphs of an item
- WHEN the content is rendered or patched
- THEN each run is one blank-lines block placed inside the list item that holds it, after the last child that starts before the run, and a patch that replaces the list puts the block back in the new item

### Scenario: Nothing is shown

- GIVEN a single blank separator, a run inside a code fence, a directive, an HTML block or a table (also in a list item), a run inside a quote, an alert, an admonition or a list they hold, a run next to a folded block, a folded or included list, reading mode, or the export
- WHEN the content is rendered
- THEN no blank-lines block exists, and the export drops data-okf-blank-runs and data-okf-blank-lines

### Verification notes

- Method: test/core/mapping/blankRuns.test.ts (blankRuns: separators, start, end, CR LF, lone CR, frontmatter, no-break space), test/core/render/blankRunsList.test.ts (the hidden list), test/core/export (the attributes are dropped).
- Method: test/page/runtimeBlankLines.test.ts (placement, folded and in-block runs skipped, a refresh after a patch).
- Method: the list cases of test/page/runtimeBlankLines.test.ts, test/core/render/blankRunsInLists.test.ts (the ranges the page reads), test/visual/capture_blank_lines_block.py (the blocks in their items, none in a fence).
- Criteria: only spaces and tabs are blank; the page never trusts authored data-okf-blank-lines.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-011](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-011.md): A writer adds blocks and starts an empty document from the preview
  - [StRS-MDOKFSTUDIO-BLOCK-025](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-025.md): Preview edits land exactly, in one undo step, keep line endings, or are refused with a reason
<!-- okf:links:end -->
