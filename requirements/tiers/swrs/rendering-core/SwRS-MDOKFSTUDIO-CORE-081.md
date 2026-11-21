---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-081
uuid: 5d019fec-35bd-40d1-bc5e-118fc2154b08
title: The site requirements viewer draws the map of a use case from its Main
  paths
description: When a use case has a Main paths section, the viewer SHALL draw its
  page as a joined map in SVG at its natural size, with each state shared by
  several paths drawn once, one stroke per path on a shared step, a pill showing
  the full ID and the test count of each behaviour, a line above the map saying
  what a path, a situation and a step are, a legend naming each path, a phone
  list of the same states and behaviours, and a sentence comparing the ways
  through the map with the behaviours tested one by one, with no text or pill
  overlapping another, and when it has no Main paths the page SHALL say the
  paths are not written yet.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-008
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- test/site/requirementsViewer/layout.ts
tested_in_files:
- test/site/requirementsViewer/mainPaths.test.ts
- test/site/requirementsViewer/metroMap.browser.test.ts
- test/site/requirementsViewer/metroMap.test.ts
- test/site/requirementsViewer/pages.test.ts
default_owner_email: gaetan@xeberon.net
---

## The site requirements viewer draws the map of a use case from its Main paths

### Normative behavior

When a use case has a Main paths section, the viewer SHALL draw its page as a joined map in SVG at its natural size, with each state shared by several paths drawn once, one stroke per path on a shared step, a pill showing the full ID and the test count of each behaviour, a line above the map saying what a path, a situation and a step are, a legend naming each path, a phone list of the same states and behaviours, and a sentence comparing the ways through the map with the behaviours tested one by one, with no text or pill overlapping another, and when it has no Main paths the page SHALL say the paths are not written yet.

The map is drawn at its natural size, never upscaled to the page: it keeps at least 85 % of that size and its box scrolls sideways when it is wider than the page. A state shared by several paths is one circle where the paths join and leave in their own colours (one to three colours; a fourth path reuses the third). A step taken by several paths is one pill with one stroke per path. A path that starts at a state of an earlier path shows its number there. The other outcomes of a state are listed under it. A link to a behaviour in the map and in the phone list shows its full ID, and so does the list of the behaviours of the use case.

### Scenario (nominal): Use case with Main paths

- GIVEN a use case whose Main paths hold 3 states, one step behaviour per state and a refusal option
- WHEN the use case page is written
- THEN the page holds the SVG map, the phone list of the same states and a sentence giving the number of ways through the map (4 on the fixture) against the behaviours and scenarios tested one by one, and the line above the map says the use case is reached by one path

### Scenario (nominal): Two paths share states

- GIVEN a use case with two paths that share their last two states and one step, and a behaviour with a full ID such as SwRS-MDOKFSTUDIO-GFM-102
- WHEN the use case page is written
- THEN each shared state is one circle drawn once (the class join) with both paths through it, the shared step is one group with one stroke per path in that path's colour and the step index of each path, the pill shows the full ID on its first line and the test count on its second, the line above the map says "2 paths" and "Where paths meet, they share the circle or the step", and the legend names "path 2" with its title

### Scenario (boundary): Use case without Main paths

- GIVEN a use case with no Main paths section
- WHEN the use case page is written
- THEN the page says the paths are not written yet and lists its behaviours, without a map

### Scenario (boundary): A map wider than the page

- GIVEN a use case with three paths whose map is wider than an 800 px window
- WHEN the page is shown at 1280 px and at 800 px
- THEN the SVG is never wider than its natural width and at least 85 % of it, the box of the map scrolls sideways at 800 px, and no text box (widened by 5 % on each side) overlaps another text or a pill, nor runs past the SVG

### Verification notes

- Method: Unit tests "a use case with paths draws the map, the phone list and the walk count", "the line above the map names the paths and what they share" and "a full ID is the text of every link to a requirement" in test/site/requirementsViewer/pages.test.ts, the tests of buildMetroMap and metroSvg in test/site/requirementsViewer/metroMap.test.ts, and the parser tests in mainPaths.test.ts; Chromium tests in test/site/requirementsViewer/metroMap.browser.test.ts (run by `just ci-viewer-graph`, in pinned fonts) on six frozen use cases and on every use case of the requirements report, with a capture of each frozen map at 1280 px and 800 px in out/reports/requirements-viewer-graph/.
- Criteria: The states, the transitions and the walk count match the hand-computed fixtures; one node per shared state and one stroke per path on a shared step; no text or pill overlaps another in any real use case at both widths.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-008](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-008.md): A reviewer reads the published site and its requirements
<!-- okf:links:end -->
