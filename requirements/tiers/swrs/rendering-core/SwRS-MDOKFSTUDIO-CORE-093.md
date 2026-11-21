---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-093
uuid: 40f576c9-d548-4207-bedb-73321a0dd2c2
title: The site requirements viewer names every requirement by its full ID
description: When the build writes a use case page or a behaviour page, it SHALL
  name the requirements of that page by their full ID in the eyebrow, the tab
  title, the share title, every crumb, and the accessible name and links of the
  pager.
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
- test/site/requirementsViewer/pages.ts
tested_in_files:
- test/site/requirementsViewer/idLayout.browser.test.ts
- test/site/requirementsViewer/pages.test.ts
default_owner_email: gaetan@xeberon.net
---

## The site requirements viewer names every requirement by its full ID

### Normative behavior

When the build writes a use case page or a behaviour page, it SHALL name the requirements of that page by their full ID in the eyebrow, the tab title, the share title, every crumb, and the accessible name and links of the pager.

### Scenario (nominal): A use case page

- GIVEN a use case of an area
- WHEN its page is written
- THEN its eyebrow is Use case followed by its full ID and nothing else, its tab title and its share title are Use case, its full ID, a colon and its title, its last crumb is its full ID, and no short ID appears as a text of the page

### Scenario (nominal): A behaviour page

- GIVEN a behaviour of a use case, with a previous and a next behaviour
- WHEN its page is written
- THEN its eyebrow is Behaviour followed by its full ID, its tab title and share title are Behaviour, its full ID, a colon and its title, its crumbs name the use case and the behaviour by their full ID, and the pager has the accessible name Behaviours of the full ID of the use case and links reading the full ID, a colon and the title of the previous and next behaviour

### Scenario (boundary): A long ID on a phone

- GIVEN a use case page and a behaviour page written from the real report
- WHEN they are shown at 1280, 800 and 390 px wide
- THEN the breadcrumb, the eyebrow and the pager stay inside the page, with no horizontal scroll

### Verification notes

- Method: Unit tests "a full ID names a requirement on its page" in test/site/requirementsViewer/pages.test.ts and the share titles in cards.test.ts, and a Chromium check in test/site/requirementsViewer/idLayout.browser.test.ts, skipped without Chromium unless STUDIO_REQUIRE_CHROMIUM=1.
- Criteria: The texts equal the expected strings; no element ends past the right edge of the page.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-008](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-008.md): A reviewer reads the published site and its requirements
<!-- okf:links:end -->
