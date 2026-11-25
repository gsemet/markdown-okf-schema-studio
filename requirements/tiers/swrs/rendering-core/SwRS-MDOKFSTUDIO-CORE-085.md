---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-085
uuid: 0d0f45a1-da58-4bb5-867c-4e727d8845e4
title: The site requirements viewer has a social card for each page
description: When a maintainer builds the Pages site, the build SHALL write one
  social picture for the index of the viewer and one for each feature category,
  give each page of the viewer the Open Graph and Twitter tags that point to the
  picture of its category (the index's own picture on the index), with its own
  share title and a description without inline-code backticks or link syntax,
  and give the requirements.html page the tags of the index.
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
  title: Tags of each page
- id: S2
  title: One picture per category
- id: S3
  title: Texts of a category, a use case and a behaviour
- id: S4
  title: A long rule
- id: S5
  title: No description loses a word
- id: S6
  title: The requirements.html page
- id: S7
  title: No browser
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- test/site/requirementsViewer/cards.ts
- test/site/requirementsViewer/shell.ts
- test/site/requirementsViewer/write.ts
- test/site/socialCard.ts
tested_in_files:
- test/site/requirementsViewer/cards.test.ts
- test/site/requirementsViewer/shareText.test.ts
- test/site/requirementsViewer/write.test.ts
default_owner_email: gaetan@xeberon.net
---

## The site requirements viewer has a social card for each page

### Normative behavior

When a maintainer builds the Pages site, the build SHALL write one social picture for the index of the viewer and one for each feature category, give each page of the viewer the Open Graph and Twitter tags that point to the picture of its category (the index's own picture on the index), with its own share title and a description without inline-code backticks or link syntax, and give the `requirements.html` page the tags of the index.

### Scenario S1 (nominal): Tags of each page

- GIVEN a page of the viewer: the index, a category, a use case or a behaviour
- WHEN the page is written
- THEN it carries exactly one og:title and one twitter:title equal to its own share title, an absolute og:url, an og:image equal to its twitter:image at 1200 x 630 and the summary_large_image card, and every share title is distinct

### Scenario S2 (nominal): One picture per category

- GIVEN a category, one of its use cases and one of its behaviours
- WHEN the pages are written
- THEN the three point to requirements/og/area-{areaId}.png, the index points to requirements/og/areas-card.png and no page points to a picture of a level

### Scenario S3 (nominal): Texts of a category, a use case and a behaviour

- GIVEN a category, a use case and a behaviour
- WHEN their share texts are written
- THEN the category says it is a feature category of Markdown OKF-Schema Studio, the use case has the share title Use case, its full ID, a colon and its title, and its whole user need, and the behaviour has the share title Behaviour, its full ID, a colon and its title, and its rule without backticks or link syntax

### Scenario S4 (boundary): A long rule

- GIVEN a behaviour whose rule is longer than 200 characters
- WHEN its description is written
- THEN it is cut at a word, ends with an ellipsis and is at most 200 characters

### Scenario S5 (boundary): No description loses a word

- GIVEN every description and user need of the shipped requirements
- WHEN their share text is written
- THEN each word of the text, apart from link targets, is in the share text, in the same order

### Scenario S6 (nominal): The requirements.html page

- GIVEN the requirements.html page that redirects to requirements/
- WHEN it is written
- THEN it keeps the meta refresh and the canonical link and carries the same social tags as the index page

### Scenario S7 (refusal): No browser

- GIVEN a machine without Chromium
- WHEN the pictures are drawn
- THEN the pages are already written and the build stops with a message that says Chromium does not start; the unit tests of the pictures are skipped

### Verification notes

- Method: Unit tests in test/site/requirementsViewer/cards.test.ts (tags, pictures per category, texts, "the index and category pictures are drawn", headline fit), shareText.test.ts (plain text, cut at a word, the shipped requirements) and write.test.ts (the requirements.html page).
- Criteria: The tags and texts match the fixture; the pictures are 1200 x 630 PNG files; the longest category title stays above the brand bar.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-008](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-008.md): A reviewer reads the published site and its requirements
<!-- okf:links:end -->
