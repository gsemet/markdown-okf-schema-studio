---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-080
uuid: 585a10f6-fc4b-4355-a8f9-d5660b84213b
title: The site requirements viewer has an area page and a use case list
description: When a maintainer builds the Pages site from the okfreq report, the
  build SHALL write the Requirements home with the three layers, the areas and
  the figures, and one page per active area that lists the use cases of the
  area, each use case shown with its full ID, without a page for a retired
  requirement.
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
  title: Active areas and use cases
- id: S2
  title: Retired use case
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- test/site/requirementsViewer/pages.ts
tested_in_files:
- test/site/requirementsViewer/home.test.ts
- test/site/requirementsViewer/pages.test.ts
- test/site/requirementsViewer/write.test.ts
default_owner_email: gaetan@xeberon.net
---

## The site requirements viewer has an area page and a use case list

### Normative behavior

When a maintainer builds the Pages site from the okfreq report, the build SHALL write the Requirements home with the three layers, the areas and the figures, and one page per active area that lists the use cases of the area, each with its full ID, without a page for a retired requirement.

### Scenario S1 (nominal): Active areas and use cases

- GIVEN a report with an active area holding 2 active use cases and 1 superseded one
- WHEN the site is built
- THEN requirements/ holds the home with the 3 layers and the areas, requirements/{area}/ lists the 2 use cases, each link showing the full ID of the use case (StRS-MDOKFSTUDIO-GFM-001, not GFM-001), requirements/{area}/{StRS}/ exists for each active use case and no folder exists for the superseded one; every link is relative and resolves from every depth

### Scenario S2 (refusal): Retired use case

- GIVEN a superseded use case of an area
- WHEN the History button is off
- THEN the area page keeps its row in the page but hides it, and the row names its replacement with a link

### Verification notes

- Method: Unit tests "one page per active area, use case and behaviour, none for retired", "links resolve from every depth", "a full ID is the text of every link to a requirement" and "home: layers, areas, sections, figures" in test/site/requirementsViewer/pages.test.ts and home.test.ts.
- Criteria: The folders written, the relative links and the counts match the fixture.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-008](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-008.md): A reviewer reads the published site and its requirements
<!-- okf:links:end -->
