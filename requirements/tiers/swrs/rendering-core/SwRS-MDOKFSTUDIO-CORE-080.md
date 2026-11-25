---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-080
uuid: 585a10f6-fc4b-4355-a8f9-d5660b84213b
title: The site requirements viewer has an area page and a use case list
description: When a maintainer builds the Pages site from the okfreq report, the
  build SHALL write the Requirements home with the three layers, the areas and
  the figures, and one page per active area that lists the use cases of the
  area, each use case shown with its full ID, without a page for a retired
  requirement. The page of a use case SHALL list each declared path with the
  files that test it and accept it, or its acceptance waiver and the reason.
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
- id: S3
  title: Paths with their tests and acceptances
- id: S4
  title: A waived path
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- test/site/requirementsViewer/pages.ts
tested_in_files:
- test/site/requirementsViewer/home.test.ts
- test/site/requirementsViewer/model.test.ts
- test/site/requirementsViewer/pages.test.ts
default_owner_email: gaetan@xeberon.net
---

## The site requirements viewer has an area page and a use case list

### Normative behavior

When a maintainer builds the Pages site from the okfreq report, the build SHALL write the Requirements home with the three layers, the areas and the figures, and one page per active area that lists the use cases of the area, each with its full ID, without a page for a retired requirement. The page of an active use case SHALL list each path declared in its `scenarios:` with the files that the trace file names as testing it and as accepting it; without a trace file it SHALL list the paths and say that the trace file was not generated. For a use case with an acceptance waiver, each path SHALL show a "waived" badge and the waiver reason, in place of the accepted files, with or without a trace file.

### Scenario S1 (nominal): Active areas and use cases

- GIVEN a report with an active area holding 2 active use cases and 1 superseded one
- WHEN the site is built
- THEN requirements/ holds the home with the 3 layers and the areas, requirements/{area}/ lists the 2 use cases, each link showing the full ID of the use case (StRS-MDOKFSTUDIO-GFM-001, not GFM-001), requirements/{area}/{StRS}/ exists for each active use case and no folder exists for the superseded one; every link is relative and resolves from every depth

### Scenario S2 (refusal): Retired use case

- GIVEN a superseded use case of an area
- WHEN the History button is off
- THEN the area page keeps its row in the page but hides it, and the row names its replacement with a link

### Scenario S3 (nominal): Paths with their tests and acceptances

- GIVEN an active use case that declares paths S1 and S2, a trace that names a test file for S1 and S2 and an
  acceptance file for S1
- WHEN the site is built
- THEN the use case page lists "S1" and "S2" with their titles, each with its tested files and its accepted files,
  and S2 shows no accepted file; with no trace file the paths are listed without files and the page
  says that the trace file was not generated

### Scenario S4 (boundary): A waived path

- GIVEN an active use case with `acceptance_exemption: true` and a reason
- WHEN the site is built
- THEN each path of its page carries a "waived" badge and the reason, in place of the accepted files,
  with or without a trace file

### Verification notes

- Method: Unit tests "one page per active area, use case and behaviour, none for retired", "links resolve from every depth", "a full ID is the text of every link to a requirement" and "home: layers, areas, sections, figures" in test/site/requirementsViewer/pages.test.ts and home.test.ts.
  Paths (S3): "a use case page lists each path with its tested and accepted files" in pages.test.ts
  and "paths and scenarios are read from the frontmatter and joined with the trace markers" in
  model.test.ts. Waiver (S4): "a waived StRS shows the waiver and its reason on each path" and "a
  waived StRS shows the waiver and its reason on each path without a trace file" in pages.test.ts,
  and "the acceptance waiver of a StRS is read with its reason" in model.test.ts.
- Criteria: The folders written, the relative links and the counts match the fixture; each path lists
  the files of the trace fixture, and a waived path shows the badge and the reason.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-008](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-008.md): A reviewer reads the published site and its requirements
<!-- okf:links:end -->
