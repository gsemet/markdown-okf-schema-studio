---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-092
uuid: 62ee6527-23c6-4430-895e-e998d9561c78
title: The site requirements viewer finds a requirement by its ID
description: When a reader types the full ID, the short ID or the bare number of
  a use case or a behaviour in the search of the site requirements viewer, in
  any case and with or without the leading zeros of its number, the page SHALL
  list the requirements that ID names before any other hit, and Enter SHALL open
  the first.
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
  title: Full ID, short ID, any case
- id: S2
  title: A number is not a text hit of another number
- id: S3
  title: A short ID shared by a use case and a behaviour
- id: S4
  title: A bare number
- id: S5
  title: A retired ID
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- test/site/requirementsViewer/viewer.js
tested_in_files:
- test/site/requirementsViewer/searchMatch.test.ts
default_owner_email: gaetan@xeberon.net
---

## The site requirements viewer finds a requirement by its ID

### Normative behavior

When a reader types the full ID, the short ID or the bare number of a use case or a behaviour in the search of the site requirements viewer, in any case and with or without the leading zeros of its number, the page SHALL list the requirements that ID names before any other hit, and Enter SHALL open the first.

### Scenario S1 (nominal): Full ID, short ID, any case

- GIVEN a use case and a behaviour that share the number 14 in an area
- WHEN the reader types the full ID, the full ID in other letter cases, the short ID or the short ID with its number written without the leading zero
- THEN the use case is listed first and the behaviour right under it for a short ID, only the requirement of that tier for a full ID, and Enter opens the first

### Scenario S2 (boundary): A number is not a text hit of another number

- GIVEN requirements numbered 14 and 140 in the same area
- WHEN the reader types the short ID with the number 14
- THEN the requirement numbered 14 is listed first, and the one numbered 140 comes only after it as a text hit

### Scenario S3 (boundary): A short ID shared by a use case and a behaviour

- GIVEN a short ID that names both a use case and a behaviour
- WHEN the reader types it and presses Enter
- THEN the use case is listed first, the behaviour right under it, and Enter opens the use case

### Scenario S4 (nominal): A bare number

- GIVEN requirements numbered 14 in several areas and a behaviour whose title holds the text 14
- WHEN the reader types 14 or 014
- THEN every requirement numbered 14 is listed first, before any text hit, the list stops at 30 entries counting them first, and no requirement numbered 140 or 114 is one of them

### Scenario S5 (refusal): A retired ID

- GIVEN a retired requirement and the History button off
- WHEN the reader types its ID
- THEN it is not listed, and it is listed once History is on

### Verification notes

- Method: Unit tests in test/site/requirementsViewer/searchMatch.test.ts, which run the shipped viewer.js against the index of a fixture, and "search index entries" in search.test.ts for the full ID of each entry.
- Criteria: The order of the links of the result list, the kind headings and the target of Enter match the scenarios.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-008](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-008.md): A reviewer reads the published site and its requirements
<!-- okf:links:end -->
