---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-082
uuid: 0ee9b4b6-ae17-4a76-93c2-d62b924f917f
title: The site requirements viewer has a page for each behaviour
description: When a maintainer builds the Pages site, the viewer SHALL write one
  page per active SwRS that shows its rule, where it sits in the paths of its
  use case (naming the use case by its full ID), its scenarios, and the files
  that implement and test it at the commit of the build.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-008
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- test/site/requirementsViewer/model.ts
- test/site/requirementsViewer/pages.ts
tested_in_files:
- test/site/requirementsViewer/bundle.test.ts
- test/site/requirementsViewer/model.test.ts
- test/site/requirementsViewer/pages.test.ts
default_owner_email: gaetan@xeberon.net
---

## The site requirements viewer has a page for each behaviour

### Normative behavior

When a maintainer builds the Pages site, the viewer SHALL write one page per active SwRS that shows its rule, where it sits in the paths of its use case (naming the use case by its full ID), its scenarios, and the files that implement and test it at the commit of the build.

### Scenario (nominal): Behaviour page

- GIVEN an active SwRS with 2 scenarios, one source file and 2 test files
- WHEN the site is built
- THEN its page shows the rule, where it sits in the paths ("Step 1 of path 1 in StRS-MDOKFSTUDIO-GFM-001", the full ID of the use case being a link), the scenarios, and the files as links to the repository at the commit of the build, each test file tagged with its kind

### Scenario (boundary): Exempt behaviour

- GIVEN a SwRS exempt from markers
- WHEN its page is written
- THEN the page says it is exempt, with the reason, instead of listing files

### Scenario (nominal): A table scenario shows its table

- GIVEN an active SwRS whose scenario is written as a table with its own headers
- WHEN its page is written
- THEN the scenario card shows that table with the same headers and one row per source row, and no empty Given / When / Then columns

### Scenario (boundary): A scenario with steps, a note and a table

- GIVEN a scenario with GIVEN / WHEN / THEN lines, a note line and a table
- WHEN its page is written
- THEN the card shows the steps in their three columns, the note as a paragraph and the table, in source order

### Verification notes

- Method: Unit tests "behaviour page: files at the commit, kinds, retired rows" and "a full ID is the text of every link to a requirement" in test/site/requirementsViewer/pages.test.ts and "the model reads scenarios, files and known issues" in model.test.ts. Table and mixed scenarios: "the model reads table scenarios, notes and mixed scenarios in source order" in model.test.ts and "a table scenario shows its table and a mixed scenario shows steps, note and table in order" in pages.test.ts. The guard "no scenario card of the requirements bundle is empty" in bundle.test.ts renders every scenario of the real requirements bundle.
- Criteria: The links, the kinds and the scenarios match the fixture; no card of the bundle is empty.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-008](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-008.md): A reviewer reads the published site and its requirements
<!-- okf:links:end -->
