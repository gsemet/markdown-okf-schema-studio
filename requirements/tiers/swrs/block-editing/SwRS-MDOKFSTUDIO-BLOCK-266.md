---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-266
uuid: 67d10e20-e5f6-4e08-a7b5-6af9441a918d
title: Edit mode shows each shown blank line as a blank-line block
description: When edit mode is on, the extension SHALL show each shown blank
  line as one blank-line block, so that N blank lines between two blocks show
  N-1 blocks, the first being the separator that stays hidden, and it shows
  every blank line at the end of the body, at the top of a file without
  frontmatter and in a body of only blank lines; of the empty quote lines of a
  run it shows all but the first, wherever the run stands. This holds between
  top-level blocks, between list items, inside a list item, and inside a quote,
  an alert, an admonition, a definition or a footnote; the blocks are placed
  from the host's list of shown lines, inside the list item or container that
  holds them, and nothing is shown for a separator, a blank line inside another
  block (a fence, an HTML block or a table), next to a folded block, in a folded
  or included list, in reading mode or in the export.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-011
- StRS-MDOKFSTUDIO-BLOCK-025
scenarios:
- id: S1
  title: Blank lines are shown
- id: S2
  title: A line of text then six blank lines
- id: S3
  title: Frontmatter then three blank lines
- id: S4
  title: Quote lines
- id: S5
  title: Runs inside a list are shown
- id: S6
  title: Nothing is shown
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/export/exportContent.ts
- src/core/mapping/blankRuns.ts
- src/core/mapping/blockRange.ts
- src/core/mapping/quoteLine.ts
- src/core/preview/styles/blankLinesInContainersStyles.ts
- src/core/preview/styles/editModeStyles.ts
- src/core/render/mystBlockTransforms.ts
- src/core/render/mystNormalize.ts
- src/core/render/mystRenderer.ts
- src/core/render/renderPipeline.ts
- src/page/features/blankLines.ts
- src/page/features/blankRunHosts.ts
- src/page/features/blockSelectionView.ts
tested_in_files:
- test/core/export/htmlExport.test.ts
- test/core/mapping/blankRuns.test.ts
- test/core/mapping/quoteBlankRuns.test.ts
- test/core/protocol/pageToHost.test.ts
- test/core/render/blankRunsInLists.test.ts
- test/core/render/blankRunsList.test.ts
- test/integration/blankLines.test.ts
- test/page/runtimeBlankLines.test.ts
- test/page/runtimeBlankLinesContainers.test.ts
- test/visual/blankLinesBlockScenarios.ts
- test/visual/capture_blank_lines_block.py
- test/visual/capture_blank_lines_containers.py
default_owner_email: gaetan@xeberon.net
---

## Edit mode shows each shown blank line as a blank-line block

### Normative behavior

When edit mode is on, the extension SHALL show each shown blank line as one blank-line block: of N blank lines between two blocks it shows N-1, the first being the separator that stays hidden, and it shows every blank line at the end of the body, at the top of a file without frontmatter and in a body of only blank lines; of the empty quote lines of a run it shows all but the first, wherever the run stands. This holds between top-level blocks, between list items, inside a list item, and inside a quote, an alert, an admonition, a definition or a footnote; the blocks are placed from the host's list of shown lines, inside the list item or container that holds them, and nothing is shown for a separator, a blank line inside another block (a fence, an HTML block or a table), next to a folded block, in a folded or included list, in reading mode or in the export.

### Scenario S1: Blank lines are shown

- GIVEN edit mode on and a source with two blank lines between two blocks, two at the start of a file without frontmatter, and three at the end of the body
- WHEN the content is rendered or patched
- THEN the two between the blocks show one blank-line block (the first line is the separator), the two at the start show two, and the three at the end show three, each labelled "Blank line", placed after the insert point of the block above (or first, or before Start writing), and the host's hidden list of shown lines (data-okf-blank-runs) is the only source of them

### Scenario S2: A line of text then six blank lines

- GIVEN edit mode on and a line of text followed by six blank lines at the end of the body
- WHEN the content is rendered
- THEN six blank-line blocks show, one for each blank line

### Scenario S3: Frontmatter then three blank lines

- GIVEN edit mode on and frontmatter followed by three blank lines and nothing else
- WHEN the content is rendered
- THEN three blank-line blocks show, because the body has no block to separate

### Scenario S4: Quote lines

- GIVEN edit mode on and a quote with three empty quote lines in a row
- WHEN the content is rendered
- THEN two blank-line blocks show inside the quote, the first empty quote line being the separator

### Scenario S5: Runs inside a list are shown

- GIVEN edit mode on and a top-level list with a run between two items and a run between two paragraphs of an item
- WHEN the content is rendered or patched
- THEN each shown blank line is one blank-line block placed inside the list item that holds it, after the last child that starts before it, and a patch that replaces the list puts the block back in the new item

### Scenario S6: Nothing is shown

- GIVEN a single blank separator, a run inside a code fence, a directive, an HTML block or a table (also in a list item), a run inside a quote, an alert, an admonition or a list they hold, a run next to a folded block, a folded or included list, reading mode, or the export
- WHEN the content is rendered
- THEN no blank-line block exists, and the export drops data-okf-blank-runs and data-okf-blank-lines

### Verification notes

- Method: test/core/mapping/blankRuns.test.ts (shownBlankLines: N-1 blocks, the end of the body, line 1, a body of only blank lines, quote runs, CR LF, lone CR, no-break space; a line of text then six blank lines), test/core/render/blankRunsList.test.ts (the hidden list of shown lines, the issue's case "2-7"), test/core/export (the attributes are dropped).
- Method: test/page/runtimeBlankLines.test.ts (one block per line of a range, placement, folded and in-block runs skipped, a refresh after a patch), test/visual/capture_blank_lines_block.py (two blocks for three blank lines, six blocks for six).
- Method: the list cases of test/page/runtimeBlankLines.test.ts, test/core/render/blankRunsInLists.test.ts (the ranges the page reads), test/visual/capture_blank_lines_block.py (the blocks in their items, none in a fence).
- Criteria: only spaces and tabs are blank; the label is "Blank line" and no block shows a line count; the page never trusts authored data-okf-blank-lines.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-011](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-011.md): A writer adds blocks and starts an empty document from the preview
  - [StRS-MDOKFSTUDIO-BLOCK-025](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-025.md): Preview edits land exactly, in one undo step, keep line endings, or are refused with a reason
<!-- okf:links:end -->
