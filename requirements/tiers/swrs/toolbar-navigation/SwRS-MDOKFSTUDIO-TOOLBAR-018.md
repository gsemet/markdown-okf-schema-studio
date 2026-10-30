---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-018
uuid: d9dfdef0-c8c0-4d11-8292-32a0d2b93ac8
title: "The sticky band shows the current heading path"
description: "When a heading of level h1 to h6 of the running text lies at or above
  the reading line, the extension SHALL show in the sticky band that heading and its
  nearest parent headings, one line each, up to the depth setting, each line written
  with its # markers and without comment chips, and hide the band and empty its text
  when no heading lies at or above the reading line."
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: proposed
status: stable
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
- test/visual/scenarioDefinitions1.ts
default_owner_email: gaetan@xeberon.net
---

## The sticky band shows the current heading path

### Normative behavior

When a heading of level h1 to h6 of the running text lies at or above the reading line, the extension SHALL show in the sticky band that heading and its nearest parent headings, one line each, up to the depth setting, each line written with its # markers and without comment chips, and hide the band and empty its text when no heading lies at or above the reading line.

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
- GIVEN an h5 heading in a normal section
- WHEN the reading line passes it
- THEN the band shows the h5 heading with five # markers

### Scenario (boundary): Zero-height heading
- GIVEN a heading with zero height between an h1 and an h3
- WHEN the page measures headings
- THEN it is never the current heading and never a parent line, so the band holds the h1 and the h3 only

### Scenario (boundary): Headings the table of contents leaves out
- GIVEN an h2 inside an admonition and an h4 inside the properties table, between an h1 and an h3
- WHEN the reading line passes them
- THEN neither is the current heading nor a parent line, so the band follows the headings of the running text only

### Scenario (nominal): Comment chips
| Heading | Band line |
| --- | --- |
| text followed by a comment chip | the heading words only, without the chip and its hidden body |
| plain heading | the heading text unchanged |

### Verification notes
- Method: test/page/runtimeScroll.test.ts (Depth 3 and Skipped level: the top-aligned sticky band grows and shrinks with the active heading hierarchy; Above the first heading: hidden state at the start; Comment chips: the sticky band label leaves out comment chips and their hidden bodies).
- Method: test/page/modules/toolbarReq.requirements.test.ts (Every heading level: the sticky band follows every heading from h1 to h6; Zero-height heading: a heading without height is neither the current heading nor a parent line; Headings the table of contents leaves out: headings inside an admonition or the properties table never enter the band).
- Method: test/visual/scenarioDefinitions2.ts, toolbar-navigation/v39-sticky-running-text-light-900 and v40-sticky-running-text-dark-900 (a heading inside a note never appears in the band)
- Method: test/visual/capture_final_checks.py (check_sticky_headings on toolbar-navigation/v01 (depth 1), v02 (depth 2), v03 and v04 (depth 3): exact text and line count; Depth 3).
- Criteria: Lines equal the ancestor chain, at most depth lines, each prefixed by # repeated level times and a space; hidden is true and the text empty when no heading is active; measureHeadings selects h1 to h6 and keeps the headings with a height that are not inside an admonition or the properties table; the label has no text of the .okf-comment elements.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-004](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-004.md): The reader always sees the section being read
<!-- okf:links:end -->
