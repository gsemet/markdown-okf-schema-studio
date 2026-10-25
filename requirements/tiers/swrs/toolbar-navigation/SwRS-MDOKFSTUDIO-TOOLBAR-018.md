---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-018
uuid: d9dfdef0-c8c0-4d11-8292-32a0d2b93ac8
title: "The sticky band shows the current heading path"
description: "When a heading of level h1 to h6 lies at or above the reading line,
  the extension SHALL show in the sticky band that heading and its nearest parent
  headings, one line each, up to the depth setting, each line written with its # markers
  and without comment chips, and hide the band and empty its text when no heading
  lies at or above the reading line."
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-004
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/stickyHeadings.ts
tested_in_files:
- test/page/modules/toolbarReq.requirements.test.ts
- test/page/runtimeScroll.test.ts
- test/visual/capture_final_checks.py
---

## The sticky band shows the current heading path

### Normative behavior

When a heading of level h1 to h6 lies at or above the reading line, the extension SHALL show in the sticky band that heading and its nearest parent headings, one line each, up to the depth setting, each line written with its # markers and without comment chips, and hide the band and empty its text when no heading lies at or above the reading line.

### Scenario (nominal): Depth 3
- GIVEN a document with h1, h2 and h3 headings, depth 3 and the reading line inside the h3 section
- WHEN the page updates the band
- THEN the band holds three lines such as # Title, ## Section and ### Part

### Scenario (boundary): Skipped level
- GIVEN an h1 followed directly by an h3 and depth 3
- WHEN the page updates the band
- THEN the band holds two lines, the h1 and the h3, because a parent must be a shallower level than the line below it

### Scenario (boundary): Above the first heading
- GIVEN a document whose first heading is below the reading line
- WHEN the page is scrolled to the top
- THEN the band is hidden and has no text
- WHEN the same document is scrolled past the first heading and the page updates the band
- THEN the band shows

### Scenario (nominal): Every heading level
- GIVEN an h5 heading inside an admonition
- WHEN the reading line passes it
- THEN the band shows the h5 heading with five # markers

### Scenario (boundary): Zero-height heading
- GIVEN a heading with zero height
- WHEN the page measures headings
- THEN it is never the current heading

### Scenario (nominal): Comment chips
| Heading | Band line |
| --- | --- |
| text followed by a comment chip | the heading words only, without the chip and its hidden body |
| plain heading | the heading text unchanged |

### Known issues
- Known issue: a zero-height heading is still written as a parent line of the band, because the parent walk uses the list of all headings and only the current-heading search skips the ones without a height.

### Verification notes
- Method: test/page/runtimeScroll.test.ts (Depth 3 and Skipped level: the top-aligned sticky band grows and shrinks with the active heading hierarchy; Above the first heading: hidden state at the start; Comment chips: the sticky band label leaves out comment chips and their hidden bodies).
- Method: test/page/modules/toolbarReq.requirements.test.ts (Every heading level and Zero-height heading: the sticky band follows every heading from h1 to h6 and ignores a heading without height).
- Method: test/visual/capture_final_checks.py (check_sticky_headings on toolbar-navigation/v01 (depth 1), v02 (depth 2), v03 and v04 (depth 3): exact text and line count; Depth 3).
- Criteria: Lines equal the ancestor chain, at most depth lines, each prefixed by # repeated level times and a space; hidden is true and the text empty when no heading is active; measureHeadings selects h1 to h6 and keeps the headings with a height; the label has no text of the .okf-comment elements.
