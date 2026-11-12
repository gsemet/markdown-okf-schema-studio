---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-083
uuid: 8ff29f73-7b4e-4f45-b937-6b3637980e5b
title: The site requirements viewer keeps retired requirements behind History
description: When a requirement is superseded, deprecated or archived, the
  viewer SHALL list it on the page of its parent with a link to its replacement,
  hide it until the History button is on, and write no page for it.
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
- test/site/requirementsViewer/model.test.ts
- test/site/requirementsViewer/pages.test.ts
default_owner_email: gaetan@xeberon.net
---

## The site requirements viewer keeps retired requirements behind History

### Normative behavior

When a requirement is superseded, deprecated or archived, the viewer SHALL list it on the page of its parent with a link to its replacement, hide it until the History button is on, and write no page for it.

### Scenario (nominal): Retired behaviour

- GIVEN a SwRS superseded by an active one
- WHEN the use case page is written
- THEN the row of the retired SwRS names "superseded by" with a link to its replacement, carries the retired class and has no page of its own

### Scenario (refusal): History off

- GIVEN a page with retired rows
- WHEN the History box is not checked
- THEN the stylesheet hides the rows of the retired class and a checked box shows them

### Verification notes

- Method: Unit tests "the model separates active from retired by req_lifecycle" in model.test.ts and "behaviour page: files at the commit, kinds, retired rows" in pages.test.ts.
- Criteria: The lifecycle is read from req_lifecycle, falling back to lifecycle; the hiding rule is not asserted visually.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TRUST-014](../../strs/trust-security/StRS-MDOKFSTUDIO-TRUST-014.md): The extension is built from pinned dependencies and ships what it loads
<!-- okf:links:end -->
