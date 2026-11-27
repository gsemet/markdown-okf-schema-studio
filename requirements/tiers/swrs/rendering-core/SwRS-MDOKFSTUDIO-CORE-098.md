---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-098
uuid: e3204e72-985f-4fd0-8039-e00f28ab8247
title: The published site has a video gallery
description: When a maintainer builds the Pages site, the site build SHALL write
  videos.html with the presentation video first, then one card per clip folder
  that holds <clip>.webm. Each card is a video with controls, preload="none", no
  autoplay and, when the folder holds poster.png, that poster. On that page, a
  click on the picture of a video that is neither loaded nor started plays it.
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
  title: The presentation video and two clips make the cards
- id: S2
  title: A new clip folder
- id: S3
  title: A folder without a WebM, a clip without an on-screen title
- id: S4
  title: No video
- id: S5
  title: Nothing loads before a click on a picture, which plays the video
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- test/site/buildSite.ts
- test/site/videoGalleryPage.ts
tested_in_files:
- test/site/videoGallery.browser.test.ts
- test/site/videoGalleryPage.test.ts
default_owner_email: gaetan@xeberon.net
---

## The published site has a video gallery

### Normative behavior

When a maintainer builds the Pages site, the site build SHALL write videos.html with the presentation video first, then one card per clip folder that holds <clip>.webm. Each card is a video with controls, preload="none", no autoplay and, when the folder holds poster.png, that poster. On that page, a click on the picture of a video that is neither loaded nor started plays it.

### Scenario S1 (nominal): The presentation video and two clips make the cards

- GIVEN the presentation video `docs/demo-video/short-demo-01/output/short-demo-01.mp4` with its `poster.png`, and two folders `docs/demo-video/clips/<clip>/`, each with `<clip>.webm`, `poster.png` and a `clip.md` that has a `Text 1` row
- WHEN the site is built
- THEN `videos.html` holds three cards, the presentation video first and then the clips in name order, each a `<video>` of its file with its poster, `controls`, `preload="none"` and no `autoplay`, a clip looping and muted and titled with its first `Text 1` row without `**`, its name on the second line; the site holds the presentation video and its poster at their repository paths, and `site-manifest.json` lists `videos.html` and `og/videos.png`

### Scenario S2 (nominal): A new clip folder

- GIVEN a built Videos page and a new folder `docs/demo-video/clips/<clip>/` that holds `<clip>.webm`
- WHEN the site is built again, with no change to the code
- THEN the page holds a card for that clip, in name order

### Scenario S3 (boundary): A folder without a WebM, a clip without an on-screen title

- GIVEN a clip folder without `<clip>.webm`, and a clip folder with its WebM and no `Text 1` row
- WHEN the site is built
- THEN the first folder has no card, and the card of the second is titled with the clip name; a card whose folder holds no `poster.png` has no poster

### Scenario S4 (boundary): No video

- GIVEN a repository with no `docs/demo-video/clips/` folder and no presentation video
- WHEN the site is built
- THEN the build passes and `videos.html` holds no card

### Scenario S5 (nominal): Nothing loads before a click on a picture, which plays the video

- GIVEN the Videos page open in a browser
- WHEN the reader loads it, clicks the middle of a card's picture, then clicks it again
- THEN no video file is requested and no video plays before the first click; that click requests the card's file and plays it; the later click, and every click on a video once it is loaded or has started, is left to the browser's own controls, so the playback never changes twice for one click

### Known issues

- Known issue: the click on the picture is a script of the page. With scripts disabled, Chromium does nothing on a click on the picture of a video that has not loaded yet; its play button, or the space bar on the focused video, starts it.

### Verification notes

- Method: Unit tests in test/site/videoGalleryPage.test.ts over a fixture tree and over the shipped clips, and a browser test in test/site/videoGallery.browser.test.ts, in Chromium, over a video it records, served on 127.0.0.1.
- Criteria: One card per clip folder with a WebM after the presentation video, each with controls, preload="none", no autoplay and its poster when the file exists; no .webm or .mp4 request on load; a click on the middle of a picture requests the clicked card's file only and plays it; a second click pauses it with one pause event, a third plays it with one play event.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-008](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-008.md): A reviewer reads the published site and its requirements
<!-- okf:links:end -->
