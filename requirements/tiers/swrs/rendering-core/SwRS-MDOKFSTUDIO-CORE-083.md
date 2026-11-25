---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-083
uuid: 8ff29f73-7b4e-4f45-b937-6b3637980e5b
title: The site requirements viewer keeps retired requirements behind History
description: When a requirement is superseded, deprecated or archived, the
  viewer SHALL list it on the page of its parent with a link to its replacement,
  hide it until the History button is on, and write no page for it; the link to
  its replacement shows the full ID of the replacement.
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
  title: Retired behaviour
- id: S2
  title: History off
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- test/site/requirementsViewer/model.ts
tested_in_files:
- test/site/requirementsViewer/model.test.ts
- test/site/requirementsViewer/pages.test.ts
default_owner_email: gaetan@xeberon.net
---

## The site requirements viewer keeps retired requirements behind History

### Normative behavior

When a requirement is superseded, deprecated or archived, the viewer SHALL list it on the page of its parent with a link to its replacement, hide it until the History button is on, and write no page for it; the link to its replacement shows the full ID of the replacement.

### Scenario S1 (nominal): Retired behaviour

- GIVEN a SwRS superseded by an active one
- WHEN the use case page is written
- THEN the row of the retired SwRS names "superseded by" with a link to its replacement showing the replacement full ID, carries the retired class and has no page of its own

### Scenario S2 (refusal): History off

- GIVEN a page with retired rows
- WHEN the History box is not checked
- THEN the stylesheet hides the rows of the retired class and a checked box shows them

### Verification notes

- Method: Unit tests "the model separates active from retired by req_lifecycle" in model.test.ts and "behaviour page: files at the commit, kinds, retired rows" and "a full ID is the text of every link to a requirement" in pages.test.ts.
- Criteria: The lifecycle is read from req_lifecycle, falling back to lifecycle; the hiding rule is not asserted visually.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-008](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-008.md): A reviewer reads the published site and its requirements
<!-- okf:links:end -->
