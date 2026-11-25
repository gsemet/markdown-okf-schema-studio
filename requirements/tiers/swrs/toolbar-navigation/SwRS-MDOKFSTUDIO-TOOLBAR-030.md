---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-030
uuid: 34d66184-a111-4b67-b11a-7e1f3daf1bf8
title: "The reading offset below the band settles without oscillation"
description: "When the band changes its height or the page updates it after a layout
  change, the extension SHALL keep the reading offset at least as large as the allowance
  for the configured depth and the largest band height seen at the current pane width,
  start the remembered height again when the width changes, measure and update at
  most three times, and cause at most two corrective scrolls after the end of scrolling
  input."
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-004
depends_on: []
scenarios:
- id: S1
  title: Deep allowance
- id: S2
  title: Width changes
- id: S3
  title: Layout changes with the band
- id: S4
  title: Same heading
- id: S5
  title: Random scrolling stress run
- id: S6
  title: Scroll to the end
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/stickyHeadings.ts
tested_in_files:
- test/page/modules/toolbarReq.requirements.test.ts
- test/page/runtimeScroll.test.ts
- test/visual/capture_page_checks.py
- test/visual/capture_toolbar_checks.py
default_owner_email: gaetan@xeberon.net
---

## The reading offset below the band settles without oscillation

### Normative behavior

When the band changes its height or the page updates it after a layout change, the extension SHALL keep the reading offset at least as large as the allowance for the configured depth and the largest band height seen at the current pane width, start the remembered height again when the width changes, measure and update at most three times, and cause at most two corrective scrolls after the end of scrolling input.

### Scenario S1 (nominal): Deep allowance
- GIVEN depth 6 and a band that shows one line
- WHEN the reading offset is refreshed
- THEN the offset is at least the allowance for six lines

### Scenario S2 (boundary): Width changes
- GIVEN a pane resized to another width
- WHEN the reading offset is refreshed
- THEN the remembered height is reset and measured again

### Scenario S3 (boundary): Layout changes with the band
- GIVEN a band whose new height moves the content each time
- WHEN the page updates the band
- THEN it stops after three passes

### Scenario S4 (boundary): Same heading
- GIVEN two passes that find the same active heading
- WHEN the page updates the band
- THEN it stops at the second pass

### Scenario S5 (nominal): Random scrolling stress run
- GIVEN 180 random scroll steps of 40 to 220 px at 18 ms intervals, at depth 3
- WHEN the input ends and 650 ms pass
- THEN at most 2 programmatic scrolls happen after the input and the position changes by at most 2 px

### Scenario S6 (boundary): Scroll to the end
- GIVEN the document scrolled to its end
- WHEN the reader keeps scrolling down
- THEN the position stays at the end and no corrective scroll fights the reader

### Verification notes
- Method: test/page/modules/toolbarReq.requirements.test.ts (Deep allowance and Width changes: the reading offset only grows for a width and starts again when the width changes).
- Method: test/page/runtimeScroll.test.ts (Layout changes with the band and Same heading: caps sticky heading convergence at three passes).
- Method: test/visual/capture_page_checks.py (Random scrolling stress run through stress_sticky_heading_scroll on scenario toolbar-navigation/v03-sticky-depth-3-oscillation-dark-900; Scroll to the end through check_scroll_at_end in test/visual/capture_toolbar_checks.py on the same scenario: at the end, 20 wheel steps down leave the page at the end and the band makes no scrollTo call).
- Criteria: readingOffset = max(policy offset for the depth, largest band height at this width, visible band bottom); no more than three measure passes per update; lateCorrections <= 2 and |after - before| <= 2.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-004](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-004.md): The reader always sees the section being read
<!-- okf:links:end -->
