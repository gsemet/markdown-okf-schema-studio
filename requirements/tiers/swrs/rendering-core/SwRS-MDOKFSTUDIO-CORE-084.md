---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-084
uuid: ecbb7f66-80d7-47e4-9c33-ebb39f0865eb
title: The site requirements viewer has a search index
description: When a maintainer builds the Pages site, the build SHALL write a
  search index of the areas, use cases, behaviours and files, with the retired
  requirements flagged so the page shows them only when History is on.
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
- test/site/requirementsViewer/pages.test.ts
- test/site/requirementsViewer/search.test.ts
- test/site/requirementsViewer/write.test.ts
default_owner_email: gaetan@xeberon.net
---

## The site requirements viewer has a search index

### Normative behavior

When a maintainer builds the Pages site, the build SHALL write a search index of the areas, use cases, behaviours and files, with the retired requirements flagged so the page shows them only when History is on.

### Scenario (nominal): Index entries

- GIVEN a report with an area, a use case, a behaviour and a retired behaviour
- WHEN the site is built
- THEN requirements/search-index.js holds one entry for each of them and one per file, a file entry giving the count of behaviours that carry it, and the retired entry is flagged

### Scenario (boundary): No report

- GIVEN no requirements report
- WHEN the site is built
- THEN the index is empty and the build does not fail

### Verification notes

- Method: Unit tests "search index entries" in test/site/requirementsViewer/search.test.ts and "a missing report writes the home and the redirect only" in write.test.ts.
- Criteria: The kinds, the links and the flags match the fixture.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TRUST-014](../../strs/trust-security/StRS-MDOKFSTUDIO-TRUST-014.md): The extension is built from pinned dependencies and ships what it loads
<!-- okf:links:end -->
