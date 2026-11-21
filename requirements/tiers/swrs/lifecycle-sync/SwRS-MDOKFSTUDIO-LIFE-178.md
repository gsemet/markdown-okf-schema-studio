---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-178
uuid: 9a1625eb-9f1f-4820-bf53-f1ff344cf557
title: The page marks a requested line with an arrow and a band at the line's
  place
description: When the host asks the page to reveal a source line, the page SHALL
  scroll silently so that the line sits at the reading line below the sticky
  heading band, unfold a folded heading section or a closed details block that
  holds it, and draw an arrow in the left margin and a light band at the exact
  line of a paragraph or a code block, at the top of the enclosing block for any
  other block, and at the nearest block for a line outside every block.
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-023
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/lineMarkerStyles.ts
- src/page/features/hostHandlers.ts
- src/page/features/lineMarker.ts
- src/page/features/scrollCore.ts
tested_in_files:
- test/core/render/lineMarkerCodeLines.test.ts
- test/page/runtimeLineMarker.test.ts
- test/visual/lineMarkerScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## The page marks a requested line with an arrow and a band at the line's place

### Normative behavior

When the host asks the page to reveal a source line, the page SHALL scroll silently so that the line sits at the reading line below the sticky heading band, unfold a folded heading section or a closed details block that holds it, and draw an arrow in the left margin and a light band at the exact line of a paragraph or a code block, at the top of the enclosing block for any other block, and at the nearest block for a line outside every block.

### Scenario (nominal)

- GIVEN a page with a numbered code block whose line 20 is `value_15 = 15`, in a 900 px pane
- WHEN the page receives previewRevealLine for line 20
- THEN one arrow and band are drawn on exactly that code line, the line sits at the reading line and is inside the viewport, its block has aria-current=location, and no previewScroll is posted

### Scenario (boundary)

| Input | Outcome |
| --- | --- |
| a line inside a closed details block or a folded heading section | the block unfolds first, then the marker is drawn |
| a line of a paragraph | the marker sits on that soft-wrapped line |
| a line of a table, list or quote | the marker sits at the top of the enclosing block |
| a line outside every block | the marker takes the nearest block |
| a page with no mapped block | nothing is drawn |

### Verification notes

- Method: test/page/runtimeLineMarker.test.ts ("a requested line gets one decorative overlay at its block and the page scrolls to it silently", "a line outside every block takes the nearest block, and a later line of a block takes the block top", "a code line takes its span, counted back from the closing fence", "a closed details block holding the line is opened first", "a page with no mapped block draws nothing") and the visual scenarios lifecycle-sync/v04 and v05 (they run on Linux and macOS CI, not on Windows). The exact line of a soft-wrapped paragraph needs a real text layout: it is covered by a visual scenario only.
- Criteria: each outcome of the tables above holds.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-023](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-023.md): A reader opens a Markdown file at a searched line and sees that line marked in Studio
<!-- okf:links:end -->
