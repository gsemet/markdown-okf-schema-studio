---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-207
uuid: 5f50da33-a834-4a77-ab88-cfc1442cf99f
title: Changed blocks get a thin change bar that moves nothing
description: When the page receives line ranges, the extension SHALL mark the
  innermost mapped element whose lines meet a range with
  data-sphinx-preview-changed and draw, for each marked block, a green bar 3 px
  wide with square ends, as high as the box of the block, in one column at the
  left margin of the page, without moving any block or text edge.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-017
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/incomingChanges.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/page/modules/incomingChanges.test.ts
- test/page/modules/reviewReq.requirements.test.ts
- test/page/runtimePageControls.test.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
---

## Changed blocks get a thin change bar that moves nothing

### Normative behavior

When the page receives line ranges, the extension SHALL mark the innermost mapped element whose lines meet a range with data-sphinx-preview-changed and draw, for each marked block, a green bar 3 px wide with square ends, as high as the box of the block, in one column at the left margin of the page, without moving any block or text edge.

### Scenario (nominal): Marking the innermost blocks

| Input | Outcome |
| --- | --- |
| A range that meets one list item | the item is marked and the list that contains it is not |
| New ranges after earlier marks | the old marks are removed and only the new ones remain |
| An empty list of ranges | all marks are removed |
| A content patch on a page that holds marks | the last received ranges are applied to the new content and the new blocks that meet them are marked |
| A content patch on a page that never received ranges | nothing is marked |

### Scenario (boundary): Blocks that are never marked

| Input | Outcome |
| --- | --- |
| A changed range over a block that is being edited, or under an open editor | that block is not marked |
| A changed range that meets a block rendered from an include directive | the block is not marked, while a distinct wrapper of the directive can be |

### Scenario (nominal): Size of one bar

| Input | Outcome |
| --- | --- |
| A marked paragraph | one bar has the top and the height of the paragraph |
| A marked code block | the bar spans the whole box of the code block, not only its text |

### Scenario (nominal): One column and no layout shift

- GIVEN marked blocks at several indentation levels, in the light, dark and cream themes
- WHEN the bars are drawn
- THEN all bars sit in one layer after the content with one left position at the left margin, no block or text position changes, no ancestor clips a bar, no bar touches an anchor icon, and the bars are visible in each theme

### Scenario (nominal): Laid out again

| Input | Outcome |
| --- | --- |
| A window resize with marked blocks | each bar follows the new top and height of its block |
| A content patch that moves a marked block | the bar moves with the block |
| A change of content size, or an image load | the bars are placed again (stabilizeLayout of the scroll core) |

### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-208: the ranges the page ignores as malformed.
- SwRS-MDOKFSTUDIO-REVIEW-195: the host that posts the ranges.
- SwRS-MDOKFSTUDIO-REVIEW-214: the Diff button that hides the bar layer.

### Verification notes

- Method: test/page/modules/incomingChanges.test.ts (unit tests `T16: the innermost mapped elements that meet a changed range are marked`, `T16: new ranges clear the old marks, empty ranges clear all`, `T16: apply puts the last ranges on replaced content`: scenario marking the innermost blocks; `T16: elements in or under an open editor are skipped`, `T16: included blocks are never marked, a distinct wrapper of the directive can be`: scenario blocks that are never marked; `T16: one bar per marked block in a layer, at the block's top and height, nested or not`: scenarios size of one bar, one column and no layout shift).
- Method: test/page/runtimePageControls.test.ts (unit test `T16: previewIncomingChanges marks blocks and reports enabled, stale ids are ignored`: scenario marking the innermost blocks).
- Method: test/core/preview/previewStyles.test.ts (unit test `T16: the change bars sit in one column of a layer, square, with no layout shift`: scenarios size of one bar, one column and no layout shift).
- Method: test/page/modules/reviewReq.requirements.test.ts (unit test: the change bars are placed again on a window resize and after a content change: scenario laid out again).
- Method: visual scenarios review-annotations/v05-change-bar-light-900, v06-change-bar-dark-900, v14-incoming-bars-light-900 and v15-incoming-bars-dark-900 (scenarios size of one bar, one column and no layout shift in the light and dark themes); real window review-annotations/r03-incoming-change-bars. The cream theme is not asserted.
- Criteria: Only innermost elements carry the attribute and it follows the last ranges; no mark appears under an editor or under an included element; the bar style has width 3px and no radius, and the layout sets its top and height from the block box; the layer is absolutely positioned with pointer events off and no block geometry changes; layout() runs on window resize, after apply and in stabilizeLayout of the scroll core (window, visual viewport and content resize, image load).
