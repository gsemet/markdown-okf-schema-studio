---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-096
uuid: 92a9b42e-11d0-408e-93a1-eae9e3685d22
title: Each screenshot of the site gallery has its own stable link
description: Each screenshot of the site gallery SHALL have the URL
  `gallery.html#<capture id>`, with the capture id built from the scenario and
  step ids, so that opening it shows that screenshot, moving to another
  screenshot changes it, Back and Forward show the screenshots seen, and an
  unknown id shows a notice and no viewer.
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
  title: A reader follows a screenshot's link
- id: S2
  title: Another run of the real-window suites
- id: S3
  title: Two captures with one id
- id: S4
  title: An unknown or malformed fragment
- id: S5
  title: A click or a key left to the browser
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- test/site/galleryPage.ts
tested_in_files:
- test/site/gallery.test.ts
- test/site/galleryLinks.browser.test.ts
default_owner_email: gaetan@xeberon.net
---

## Each screenshot of the site gallery has its own stable link

### Normative behavior

Each screenshot of the site gallery SHALL have the URL `gallery.html#<capture id>`, with the capture id built from the scenario and step ids, so that opening it shows that screenshot, moving to another screenshot changes it, Back and Forward show the screenshots seen, and an unknown id shows a notice and no viewer.

### Scenario S1 (nominal): A reader follows a screenshot's link

- GIVEN the published gallery.html with several screenshots
- WHEN a reader opens `gallery.html#<capture id>`, presses Next, then Back
- THEN the screenshot of that id is shown, Next shows the following one with its own id in the URL and in the tab title, and Back shows the first one again; each screenshot opened from the grid or reached with Previous, Next or an arrow key adds one history entry, closing the viewer adds the URL without a fragment and focuses the card of the screenshot closed, and a reload keeps the screenshot open

### Scenario S2 (boundary): Another run of the real-window suites

- GIVEN the same real-window capture under two run folders of one suite whose random suffixes differ
- WHEN the gallery is built from either of them
- THEN its URL is the same, `gallery.html#<group>/rNN-<slug>`; a visual capture takes its scenario id, plus `--<step>`, without `visual/`, and any other capture takes its path without the extension, each segment percent-encoded

### Scenario S3 (boundary): Two captures with one id

- GIVEN a screenshot root holding two run folders of one suite with the same capture
- WHEN the gallery is built
- THEN the first in name order keeps the short id, the other takes its full path without the extension (with `~2`, `~3` appended while that is taken), and every id on the page is unique

### Scenario S4 (refusal): An unknown or malformed fragment

- GIVEN a link whose fragment names no screenshot of the gallery, or does not percent-decode
- WHEN it is opened
- THEN no viewer opens, the grid shows with the notice "The screenshot `<id>` is not in this gallery: it may have been renamed or removed.", and opening a screenshot or returning to the URL without a fragment hides the notice

### Scenario S5 (boundary): A click or a key left to the browser

- GIVEN the grid of the gallery, or its open viewer
- WHEN a reader clicks a card with the middle button or with Ctrl, Meta, Shift or Alt held, or presses an arrow key with Alt or Meta held
- THEN the page does not intercept it, so the browser's own action applies (new tab, new window, download, Back or Forward): the click opens no viewer on this page, and the page moves to no other screenshot by itself

### Verification notes

- Method: Unit tests in test/site/gallery.test.ts (the ids, the fragments and the page markup) and a Chromium test in test/site/galleryLinks.browser.test.ts that serves the built page as static files.
- Criteria: Each id and fragment is the expected one and unique on the page; in Chromium the URL, the tab title, the viewer position, the focus and the notice follow clicks, keys, Back, Forward, a direct load and a reload, with no page error. The Chromium test is skipped where no Chromium can start, unless STUDIO_REQUIRE_CHROMIUM=1.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-008](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-008.md): A reviewer reads the published site and its requirements
<!-- okf:links:end -->
