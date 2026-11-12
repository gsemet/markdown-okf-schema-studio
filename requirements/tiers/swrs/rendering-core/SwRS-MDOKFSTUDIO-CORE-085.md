---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-085
uuid: 0d0f45a1-da58-4bb5-867c-4e727d8845e4
title: The site requirements viewer has a social card for each level
description: When a maintainer builds the Pages site, the build SHALL write one
  social picture for each level of the viewer (areas, area, use case, behaviour)
  and give each page the Open Graph and Twitter tags that point to the picture
  of its level.
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
- test/site/requirementsViewer/cards.test.ts
default_owner_email: gaetan@xeberon.net
---

## The site requirements viewer has a social card for each level

### Normative behavior

When a maintainer builds the Pages site, the build SHALL write one social picture for each level of the viewer (areas, area, use case, behaviour) and give each page the Open Graph and Twitter tags that point to the picture of its level.

### Scenario (nominal): Tags of a level

- GIVEN a page of each of the four levels
- WHEN the page is written
- THEN it carries its own og:title, an absolute og:url, an og:image of requirements/og/<level>.png at 1200 x 630 and the summary_large_image card

### Scenario (refusal): No browser

- GIVEN a machine without Chromium
- WHEN the pictures are drawn
- THEN the pages are already written and the build stops with a message that says Chromium does not start; the unit test of the pictures is skipped

### Verification notes

- Method: Unit tests "social tags of each level" and "the four pictures are drawn" in test/site/requirementsViewer/cards.test.ts.
- Criteria: The tags match the fixture; the pictures are 1200 x 630 PNG files.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TRUST-014](../../strs/trust-security/StRS-MDOKFSTUDIO-TRUST-014.md): The extension is built from pinned dependencies and ships what it loads
<!-- okf:links:end -->
