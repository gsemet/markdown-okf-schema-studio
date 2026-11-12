---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-069
uuid: a2e9421c-c951-4722-8aae-bfe2f5528234
title: The site Requirements home shows the requirements chain and the report
  figures
description: When a maintainer builds the Pages site, the build SHALL write the
  Requirements home at requirements/ that draws the chain from use case to test
  and shows the figures of active requirements from the okfreq report, or states
  that the report was not generated when it is missing or unreadable, without
  failing the build, and SHALL keep requirements.html as a redirect to it.
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
- test/site/requirementsViewer/home.test.ts
- test/site/requirementsViewer/model.test.ts
- test/site/requirementsViewer/write.test.ts
default_owner_email: gaetan@xeberon.net
---

## The site Requirements home shows the requirements chain and the report figures

### Normative behavior

When a maintainer builds the Pages site, the build SHALL write the Requirements home at requirements/ that draws the chain from use case to test and shows the figures of active requirements from the okfreq report, or states that the report was not generated when it is missing or unreadable, without failing the build, and SHALL keep requirements.html as a redirect to it.

### Scenario (nominal): Report present

- GIVEN a report with 3 active SwRS (2 need markers, 1 is exempt, only 1 of the 2 has a source
  marker) and 2 retired SwRS, whose lifecycle is written in req_lifecycle
- WHEN the site is built
- THEN requirements/ shows the three layers and the areas, explains what the requirements are and
  why they are kept, holds the chain diagram with the marker comments of one real requirement read
  from its source and test files, and the CI checks that keep them in sync, shows 50% of the 2
  marker targets implemented and 100% tested, counts the retired SwRS apart under "Retired
  requirements", and the Requirements link of every page of the site points to requirements/

### Scenario (nominal): Old address

- GIVEN a site built from any report
- WHEN a reader opens requirements.html
- THEN the page redirects to requirements/ with a meta refresh and holds a link and a canonical
  link to it

### Scenario (refusal): Report missing or unreadable

- GIVEN no report file, or a file that is not a requirements report
- WHEN the site is built
- THEN the build still succeeds and requirements/ holds the diagram and the text "The
  requirements report was not generated", with no figures and no area page; a marker file that
  cannot be read shows its path only

### Scenario (boundary): Nothing to measure

- GIVEN a report with no SwRS that needs markers
- WHEN the page is rendered
- THEN the coverage figures read "n/a" instead of a percentage

### Known issues

- Known issue: the page counts a lifecycle other than superseded, deprecated and archived as
  active, so a new lifecycle value is counted active until the page is updated.

### Verification notes

- Method: Unit tests "home: layers, areas, sections and figures", "home degrades without a report"
  and "an empty report shows n/a" in test/site/requirementsViewer/home.test.ts, and "the site
  navigation links requirements/", "requirements.html redirects to requirements/" and "a missing
  report writes the home and the redirect only" in test/site/requirementsViewer/write.test.ts.
- Criteria: The counts, the percentages and the degraded text match the fixture; the navigation of
  every page links requirements/ (it linked requirements.html before the viewer replaced the
  page). The published look is cream only and is asserted by
  the tests of SwRS-MDOKFSTUDIO-CORE-086.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TRUST-014](../../strs/trust-security/StRS-MDOKFSTUDIO-TRUST-014.md): The extension is built from pinned dependencies and ships what it loads
<!-- okf:links:end -->
