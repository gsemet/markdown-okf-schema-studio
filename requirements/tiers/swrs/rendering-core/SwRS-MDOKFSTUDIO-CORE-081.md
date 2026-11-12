---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-081
uuid: 5d019fec-35bd-40d1-bc5e-118fc2154b08
title: The site requirements viewer draws the map of a use case from its Main
  paths
description: When a use case has a Main paths section, the viewer SHALL draw its
  page as a metro map in SVG with a phone list of the same states and behaviours
  and a sentence comparing the ways through the map with the behaviours tested
  one by one, and when it has none the page SHALL say the paths are not written
  yet.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TRUST-014
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/requirementsViewer.markers.ts
tested_in_files:
- test/site/requirementsViewer/mainPaths.test.ts
- test/site/requirementsViewer/pages.test.ts
default_owner_email: gaetan@xeberon.net
---

## The site requirements viewer draws the map of a use case from its Main paths

### Normative behavior

When a use case has a Main paths section, the viewer SHALL draw its page as a metro map in SVG with a phone list of the same states and behaviours and a sentence comparing the ways through the map with the behaviours tested one by one, and when it has none the page SHALL say the paths are not written yet.

### Scenario (nominal): Use case with Main paths

- GIVEN a use case whose Main paths hold 3 states, one step behaviour per state and a refusal option
- WHEN the use case page is written
- THEN the page holds the SVG map, the phone list of the same states and a sentence giving the number of ways through the map (4 on the fixture) against the behaviours and scenarios tested one by one

### Scenario (boundary): Use case without Main paths

- GIVEN a use case with no Main paths section
- WHEN the use case page is written
- THEN the page says the paths are not written yet and lists its behaviours, without a map

### Verification notes

- Method: Unit tests "a use case with paths draws the map, the phone list and the walk count" and "a use case without paths says so" in test/site/requirementsViewer/pages.test.ts, and the parser tests in mainPaths.test.ts.
- Criteria: The states, the transitions and the walk count match the hand-computed fixture.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TRUST-014](../../strs/trust-security/StRS-MDOKFSTUDIO-TRUST-014.md): The extension is built from pinned dependencies and ships what it loads
<!-- okf:links:end -->
