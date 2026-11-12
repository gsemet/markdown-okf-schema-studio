---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-082
uuid: 0ee9b4b6-ae17-4a76-93c2-d62b924f917f
title: The site requirements viewer has a page for each behaviour
description: When a maintainer builds the Pages site, the viewer SHALL write one
  page per active SwRS that shows its rule, where it sits in the paths of its
  use case, its scenarios, and the files that implement and test it at the
  commit of the build.
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

## The site requirements viewer has a page for each behaviour

### Normative behavior

When a maintainer builds the Pages site, the viewer SHALL write one page per active SwRS that shows its rule, where it sits in the paths of its use case, its scenarios, and the files that implement and test it at the commit of the build.

### Scenario (nominal): Behaviour page

- GIVEN an active SwRS with 2 scenarios, one source file and 2 test files
- WHEN the site is built
- THEN its page shows the rule, where it sits in the paths, the scenarios, and the files as links to the repository at the commit of the build, each test file tagged with its kind

### Scenario (boundary): Exempt behaviour

- GIVEN a SwRS exempt from markers
- WHEN its page is written
- THEN the page says it is exempt, with the reason, instead of listing files

### Verification notes

- Method: Unit tests "behaviour page: files at the commit, kinds, retired rows" in test/site/requirementsViewer/pages.test.ts and "the model reads scenarios, files and known issues" in model.test.ts.
- Criteria: The links, the kinds and the scenarios match the fixture.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TRUST-014](../../strs/trust-security/StRS-MDOKFSTUDIO-TRUST-014.md): The extension is built from pinned dependencies and ships what it loads
<!-- okf:links:end -->
