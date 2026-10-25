---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-069
uuid: a2e9421c-c951-4722-8aae-bfe2f5528234
title: The site Requirements page shows the requirements chain and the report
  figures
description: When a maintainer builds the Pages site, the build SHALL write a
  Requirements page that draws the chain from use case to test and shows the
  figures of active requirements from the okfreq report, or states that the
  report was not generated when it is missing or unreadable, without failing the
  build.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TRUST-014
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/requirementsPage.markers.ts
tested_in_files:
- test/site/requirementsPage.test.ts
---

## The site Requirements page shows the requirements chain and the report figures

### Normative behavior

When a maintainer builds the Pages site, the build SHALL write a Requirements page that draws the chain from use case to test and shows the figures of active requirements from the okfreq report, or states that the report was not generated when it is missing or unreadable, without failing the build.

### Scenario (nominal): Report present

- GIVEN a report with 3 active SwRS (2 need markers, 1 is exempt, only 1 of the 2 has a source
  marker) and 2 retired SwRS
- WHEN the site is built
- THEN requirements.html explains what the requirements are and why they are kept, holds the
  chain diagram with the marker comments of one real requirement read from its source and test
  files, and the CI checks that keep them in sync, shows 50% of the 2 marker targets implemented
  and 100% tested, counts the retired SwRS apart under "Retired requirements", and says that
  browsing the requirements comes later

### Scenario (refusal): Report missing or unreadable

- GIVEN no report file, or a file that is not a requirements report
- WHEN the site is built
- THEN the build still succeeds and requirements.html holds the diagram and the text "The
  requirements report was not generated", with no figures; a marker file that cannot be read
  shows its path only

### Scenario (boundary): Nothing to measure

- GIVEN a report with no SwRS that needs markers
- WHEN the page is rendered
- THEN the coverage figures read "n/a" instead of a percentage

### Known issues

- Known issue: the page counts a lifecycle other than superseded, deprecated and archived as
  active, so a new lifecycle value is counted active until the page is updated.

### Verification notes

- Method: Unit tests "report figures count active requirements only", "a missing or invalid
  report degrades the page", "an empty report shows n/a" and "marker snippets come from the
  repository files and fall back to the path" in test/site/requirementsPage.test.ts, and the site
  build test "the built site links and writes the Requirements page" in the same file.
- Criteria: The counts, the percentages and the degraded text match the fixture; the navigation of
  every page links requirements.html. The published look in light and dark is not asserted.
