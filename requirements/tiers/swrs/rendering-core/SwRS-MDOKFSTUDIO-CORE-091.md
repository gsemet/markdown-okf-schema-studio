---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-091
uuid: bc668feb-9316-4584-b18b-bd2d1a5f9da1
title: The site requirements viewer plays a path of a use case map
description: When the reader presses Play path N on a use case map, the viewer
  SHALL light, in path order, every step of path N and every state at their
  ends, the steps and states that path N shares with other paths included, with
  a token in the colour of path N, and when the reader has asked for reduced
  motion it SHALL do nothing.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-008
scenarios:
- id: S1
  title: Play a path through joined states
- id: S2
  title: Reduced motion
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- test/site/requirementsViewer/viewer.js
tested_in_files:
- test/site/requirementsViewer/metroMap.browser.test.ts
default_owner_email: gaetan@xeberon.net
---

## The site requirements viewer plays a path of a use case map

### Normative behavior

When the reader presses Play path N on a use case map, the viewer SHALL light, in path order, every step of path N and every state at their ends, the steps and states that path N shares with other paths included, with a token in the colour of path N, and when the reader has asked for reduced motion it SHALL do nothing.

### Scenario S1 (nominal): Play a path through joined states

- GIVEN the map of a use case with three paths, where path 2 shares its last two states and its last two steps with path 1, and Chromium with motion allowed
- WHEN the reader presses "Play path 2"
- THEN the three steps of path 2 are lit, in the order of path 2, shared ones included, with the four states at their ends, and a token in the colour of path 2 walks them

### Scenario S2 (boundary): Reduced motion

- GIVEN the same map, and the reader's system asking for reduced motion
- WHEN the reader presses "Play path 2"
- THEN no step and no state is lit and no token moves

### Verification notes

- Method: Browser test "Play path 2 on the frozen BLOCK-014 map lights its three steps and four states, and nothing with reduced motion" in test/site/requirementsViewer/metroMap.browser.test.ts, on the frozen use case BLOCK-014 at 1280 px, in Chromium.
- Criteria: With motion allowed the lit steps are exactly the three of path 2 and the lit states its four; with reduced motion nothing is lit.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-008](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-008.md): A reviewer reads the published site and its requirements
<!-- okf:links:end -->
