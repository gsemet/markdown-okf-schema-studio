---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-193
uuid: 73fc7e2b-eca3-48ed-886b-2d7d0c4646b2
title: The line marker shows the hidden tabs that hold the line and marks its
  exact line
description: When the line marker is requested on a line inside a tab item that
  is not shown, the page SHALL select that tab and every hidden tab around the
  line, outermost first, the way a click does (the sets of the sync group
  follow, the focus does not move), unfold a folded section or a closed dropdown
  around the tab set first, and mark the exact paragraph or code line inside the
  shown tab, and SHALL select no tab for the tab-set line, nor for a later
  placement of the marker.
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
- src/page/features/lineMarkerPlacement.ts
- src/page/modules/tabs.ts
tested_in_files:
- test/page/runtimeLineMarkerPlacement.test.ts
- test/visual/lineMarkerScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## The line marker shows the hidden tabs that hold the line and marks its exact line

### Normative behavior

When the line marker is requested on a line inside a tab item that is not shown, the page SHALL select that tab and every hidden tab around the line, outermost first, the way a click does (the sets of the sync group follow, the focus does not move), unfold a folded section or a closed dropdown around the tab set first, and mark the exact paragraph or code line inside the shown tab, and SHALL select no tab for the tab-set line, nor for a later placement of the marker.

### Scenario (nominal): A line in the second tab

- GIVEN a tab set whose second tab is not shown and holds a soft-wrapped paragraph
- WHEN the page receives previewRevealLine for the third wrapped line of that paragraph
- THEN the second tab is shown (aria-selected true, its panel not hidden) and one arrow and band are drawn on that wrapped line

### Scenario (boundary): Nested, folded and later cases

| Input | Outcome |
| --- | --- |
| a tab set nested in a hidden tab | both tabs are selected, the outer one first |
| a tab set in a closed dropdown or a folded section | the dropdown or section opens first, then the tab is selected |
| a code line in the hidden tab | the marker sits on that code line |
| the tab-set line | the top of the set is marked and no tab is selected |
| the tab is selected by the marker | the sets of its sync group follow, the choice is kept after a content patch, the focus does not move |
| the reader shows another tab (keyboard or sync group) | the marker is not drawn until its tab shows again, and a later placement selects no tab |

### Verification notes

- Method: test/page/runtimeLineMarkerPlacement.test.ts (real tab sets wired to the page's tab control), test/page/modules/tabs.test.ts (reveal, sync group, onChange, the later choice after a patch) and the CR-457 visual scenarios (they run on Linux and macOS CI, not on Windows).
- Criteria: each outcome of the tables above holds.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-023](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-023.md): A reader opens a Markdown file at a searched line and sees that line marked in Studio
<!-- okf:links:end -->
