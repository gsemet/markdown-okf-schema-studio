---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-086
uuid: b6e3bd5b-f665-46e9-9c92-787702a9e195
title: The published site has one cream look on every page and picture
description: When a maintainer builds the Pages site, every page and every
  social picture SHALL use the cream palette of the extension, every page SHALL
  carry the one site header (the logo and the links Home, Contributing, How we
  ship, Gallery and Requirements, plus the breadcrumb on the requirements
  pages), and no page SHALL have a dark palette, a prefers-color-scheme dark
  rule or a theme switch.
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
- src/core/render/siteTheme.markers.ts
tested_in_files:
- test/site/requirementsViewer/pages.test.ts
- test/site/requirementsViewer/write.test.ts
- test/site/siteLinks.test.ts
- test/site/siteTheme.test.ts
default_owner_email: gaetan@xeberon.net
---

## The published site has one cream look on every page and picture

### Normative behavior

When a maintainer builds the Pages site, every page and every social picture SHALL use the cream palette of the extension, every page SHALL carry the one site header (the logo and the links Home, Contributing, How we ship, Gallery and Requirements, plus the breadcrumb on the requirements pages), and no page SHALL have a dark palette, a prefers-color-scheme dark rule or a theme switch.

### Scenario (nominal): A main page

- GIVEN a page of the site written from Markdown (home, Contributing, How we ship), the Gallery or the Reports index
- WHEN the page is written
- THEN it takes the cream tokens (background #f5f1e8, text #2b2a27, link #a14e32, border #d6cdbd), carries the site header with the logo and the five links Home, Contributing, How we ship, Gallery and Requirements in that order, and has no dark palette, no prefers-color-scheme dark rule and no theme attribute

### Scenario (nominal): A requirements page

- GIVEN a page of the requirements viewer
- WHEN the page is written
- THEN its stylesheet starts with the same cream tokens as the main pages, its header holds the same logo and five links followed by the breadcrumb, the History checkbox and the Search button, and it has no Theme button, no theme script and no stored theme choice

### Scenario (nominal): A social card

- GIVEN a social picture of a main page or of a level of the viewer
- WHEN the picture is drawn
- THEN its page uses the cream tokens, the headline is in the serif font, and none of the former teal values appears

### Scenario (boundary): A token drifts from the extension

- GIVEN a site token whose value differs from its variable in the cream block of the extension's page chrome
- WHEN the unit tests run
- THEN the token drift test fails and names the token

### Verification notes

- Method: Unit tests in test/site/siteTheme.test.ts (token drift, no dark mode, one header, cards in cream), test/site/siteLinks.test.ts and test/site/requirementsViewer/write.test.ts.
- Criteria: Every site token equals its extension variable; no page, stylesheet or script has a dark rule, a theme attribute, a stored theme choice or a Theme button; a main page and a viewer page carry the same brand and links in the same order.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TRUST-014](../../strs/trust-security/StRS-MDOKFSTUDIO-TRUST-014.md): The extension is built from pinned dependencies and ships what it loads
<!-- okf:links:end -->
