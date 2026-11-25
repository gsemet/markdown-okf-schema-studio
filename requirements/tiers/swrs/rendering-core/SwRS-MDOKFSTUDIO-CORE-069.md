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
  failing the build, and SHALL keep requirements.html as a redirect to it. The
  figures SHALL include the StRS paths tested and accepted, the StRS covered and
  the SwRS scenarios tested; without the trace file the tested and accepted
  counts of paths and scenarios SHALL read n/a.
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
  title: Report present
- id: S2
  title: Old address
- id: S3
  title: Report missing or unreadable
- id: S4
  title: Nothing to measure
- id: S5
  title: Paths and scenarios counted
- id: S6
  title: Trace file missing
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- test/site/requirementsViewer/home.ts
- test/site/requirementsViewer/model.ts
tested_in_files:
- test/site/requirementsViewer/home.test.ts
- test/site/requirementsViewer/model.test.ts
- test/site/requirementsViewer/write.test.ts
default_owner_email: gaetan@xeberon.net
---

## The site Requirements home shows the requirements chain and the report figures

### Normative behavior

When a maintainer builds the Pages site, the build SHALL write the Requirements home at requirements/ that draws the chain from use case to test and shows the figures of active requirements from the okfreq report, or states that the report was not generated when it is missing or unreadable, without failing the build, and SHALL keep requirements.html as a redirect to it. The figures SHALL include the StRS paths tested and accepted, the StRS covered and the SwRS scenarios tested, and for each area the paths tested and accepted. The build SHALL count the declared paths and scenarios from the `scenarios:` of each requirement, and their tests and acceptances from the `requirements-trace.json` next to the report; without that file the tested and accepted counts SHALL read "n/a" and the home SHALL say that the trace file was not generated.

### Scenario S1 (nominal): Report present

- GIVEN a report with 3 active SwRS (2 need markers, 1 is exempt, only 1 of the 2 has a source
  marker) and 2 retired SwRS, whose lifecycle is written in req_lifecycle
- WHEN the site is built
- THEN requirements/ shows the three layers and the areas, explains what the requirements are and
  why they are kept, holds the chain diagram with the marker comments of one real requirement read
  from its source and test files, and the CI checks that keep them in sync, shows 50% of the 2
  marker targets implemented and 100% tested, counts the retired SwRS apart under "Retired
  requirements", and the Requirements link of every page of the site points to requirements/

### Scenario S2 (nominal): Old address

- GIVEN a site built from any report
- WHEN a reader opens requirements.html
- THEN the page redirects to requirements/ with a meta refresh and holds a link and a canonical
  link to it

### Scenario S3 (refusal): Report missing or unreadable

- GIVEN no report file, or a file that is not a requirements report
- WHEN the site is built
- THEN the build still succeeds and requirements/ holds the diagram and the text "The
  requirements report was not generated", with no figures and no area page; a marker file that
  cannot be read shows its path only

### Scenario S4 (boundary): Nothing to measure

- GIVEN a report with no SwRS that needs markers
- WHEN the page is rendered
- THEN the coverage figures read "n/a" instead of a percentage

### Scenario S5 (nominal): Paths and scenarios counted

- GIVEN a report and a `requirements-trace.json` (`okfreq trace requirements --json`) for 2 active StRS
  that declare 3 paths (2 tested, 1 accepted) and 1 covered, and 3 SwRS that declare 5 scenarios (4 tested)
- WHEN the site is built
- THEN the figures show the cards "StRS paths tested 2/3", "StRS paths accepted 1/3", "StRS covered 1/2" and
  "SwRS scenarios tested 4/5", the "Paths tested" card says a path counts as tested only where a simulated
  walk exists, the "StRS covered" card says it follows okfreq's current coverage mode, the area table has the
  columns "Paths tested" and "Paths accepted" after "Tested", and the card "StRS with a stakeholder validation
  test" is gone; the counts do not depend on the coverage mode

### Scenario S6 (refusal): Trace file missing

- GIVEN a report and no `requirements-trace.json` next to it
- WHEN the site is built
- THEN the build succeeds, the declared paths and scenarios are still counted from the `scenarios:` of each
  requirement (the "/N" of the cards), the tested and accepted counts read "n/a", and the page says that the
  trace file was not generated

### Known issues

- Known issue: the page counts a lifecycle other than superseded, deprecated and archived as
  active, so a new lifecycle value is counted active until the page is updated.

### Verification notes

- Method: Unit tests "home: layers, areas, sections and figures", "home degrades without a report"
  and "an empty report shows n/a" in test/site/requirementsViewer/home.test.ts, and "the site
  navigation links requirements/", "requirements.html redirects to requirements/" and "a missing
  report writes the home and the redirect only" in test/site/requirementsViewer/write.test.ts.
  Paths and scenarios (S5, S6): "home: the cards of paths, StRS covered and scenarios, and the area
  columns" and "home: without the trace file the path and scenario counts read n/a" in home.test.ts,
  "paths and scenarios are read from the frontmatter and joined with the trace markers" and "without
  the trace the declared counts stay and no file is listed" in model.test.ts, and "the trace file
  next to the report feeds the path and scenario counts; without it the build still passes" in
  write.test.ts.
- Criteria: The counts, the percentages and the degraded text match the fixture; the navigation of
  every page links requirements/ (it linked requirements.html before the viewer replaced the
  page). The published look is cream only and is asserted by
  the tests of SwRS-MDOKFSTUDIO-CORE-086.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-008](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-008.md): A reviewer reads the published site and its requirements
<!-- okf:links:end -->
