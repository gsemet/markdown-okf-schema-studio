---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-220
uuid: 5e9c490c-5a77-448d-a39c-6143eb1149d8
title: A change bar shows the changed lines in a tooltip while the pointer is
  over it
description: When the pointer is over a change bar itself, the page SHALL show a
  tooltip in the page's tooltip style reading Changed lines 12–14 since last
  commit, or Changed line 12 since last commit for a single line, from the
  source lines of the marked block that meet the changed ranges, and SHALL show
  no tooltip while the pointer is over the block but not the bar, while the bars
  are hidden with the Diff button off, or in edit mode.
project: markdown-okf-schema-studio
scope: review-annotations
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-017
annotation_exemption: false
exemption_reason:
relates_to:
- SwRS-MDOKFSTUDIO-REVIEW-207
- SwRS-MDOKFSTUDIO-REVIEW-214
derived_by: []
implemented_in_files:
- src/core/preview/styles/commentStyles.ts
- src/page/modules/incomingChanges.ts
tested_in_files:
- test/core/preview/changeBarTooltipStyles.test.ts
- test/page/modules/incomingChanges.test.ts
- test/visual/changeBarTooltipScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## A change bar shows the changed lines in a tooltip while the pointer is over it

### Normative behavior

When the pointer is over a change bar itself, the page SHALL show a tooltip in the page's tooltip style reading Changed lines 12–14 since last commit, or Changed line 12 since last commit for a single line, from the source lines of the marked block that meet the changed ranges, and SHALL show no tooltip while the pointer is over the block but not the bar, while the bars are hidden with the Diff button off, or in edit mode.

### Scenario (nominal): The pointer is over a bar

- GIVEN a block of lines 12 to 14 marked as changed, and a block of line 20 only
- WHEN the pointer rests on the bar of the first block, then on the bar of the second
- THEN a bubble in the page's tooltip style reads Changed lines 12–14 since last commit, then Changed line 20 since last commit

### Scenario (boundary): Only the changed lines of the block

| Input | Outcome |
| --- | --- |
| A block of lines 20 to 30 and ranges 22 to 23 and 27 to 40 | the bubble reads Changed lines 22–30 since last commit (the first and last changed lines inside the block) |
| A range that meets the block on one line | the singular form, Changed line N since last commit |

### Scenario (refusal): No bubble away from the bar, with the bars hidden or in edit mode

- GIVEN the pointer over the marked block but not over its bar, the Diff button pressed off, or edit mode on
- WHEN the pointer moves
- THEN no bubble is shown: only the bar itself takes the pointer, the layer is hidden with Diff off, and edit mode takes the pointer from the bars

### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-207: the change bar the tooltip belongs to.
- SwRS-MDOKFSTUDIO-REVIEW-214: the Diff button that hides the bars and so their tooltip.

### Verification notes

- Method: test/page/modules/incomingChanges.test.ts (unit tests `CR 463: each bar carries the changed lines of its block as its tooltip`, `CR 463: changedLinesLabel uses the singular for one line and an en dash for a range`: nominal and boundary scenarios).
- Method: test/core/preview/changeBarTooltipStyles.test.ts (unit test: the bubble shows on the bar's own hover only, never in edit mode or with the layer hidden: refusal scenario).
- Method: visual scenarios review-annotations/v31-change-bar-tooltip-light-900 and v32-change-bar-tooltip-dark-900 (nominal scenario, real pointer).
- Criteria: the data-tooltip of each bar reads Changed line N or Changed lines N–M since last commit from the source lines of its block that meet the ranges; the bubble is visible only on the hover of the bar.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-017](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-017.md): A writer sees which blocks changed since the last commit
- Relates to:
  - [SwRS-MDOKFSTUDIO-REVIEW-207](SwRS-MDOKFSTUDIO-REVIEW-207.md): Changed blocks get a thin change bar that moves nothing, and malformed ranges are ignored
  - [SwRS-MDOKFSTUDIO-REVIEW-214](SwRS-MDOKFSTUDIO-REVIEW-214.md): The Diff button and the showIncomingChanges setting hide the change bars
<!-- okf:links:end -->
