---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-095
uuid: 14a98d8a-12d6-41dd-9395-e6cfb9f79deb
title: The published site plays a feature clip as a looping video
description: When a maintainer builds the Pages site, an image of a page that
  shows a feature clip's GIF (docs/demo-video/clips/<clip>/<clip>.gif with
  <clip>.webm beside it) SHALL become a looping, muted, autoplaying video of the
  WebM with the poster and the GIF as fallback, and the site SHALL carry the
  clip's WebM, GIF and poster.
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
  title: "A page shows a feature clip's GIF"
- id: S2
  title: No WebM beside the GIF
- id: S3
  title: A GIF outside the clips folder
- id: S4
  title: No clips folder
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- test/site/siteClips.ts
tested_in_files:
- test/site/siteClips.test.ts
default_owner_email: gaetan@xeberon.net
---

## The published site plays a feature clip as a looping video

### Normative behavior

When a maintainer builds the Pages site, an image of a page that shows a feature clip's GIF (docs/demo-video/clips/<clip>/<clip>.gif with <clip>.webm beside it) SHALL become a looping, muted, autoplaying video of the WebM with the poster and the GIF as fallback, and the site SHALL carry the clip's WebM, GIF and poster.

### Scenario S1 (nominal): A page shows a feature clip's GIF

- GIVEN a page written from Markdown (a docs page or the README) with a Markdown image of `docs/demo-video/clips/x/x.gif`, with `x.webm` and `poster.png` in the same folder
- WHEN the site is built
- THEN the image becomes a `<video>` of `x.webm` with `poster.png`, autoplay, loop, muted, playsinline and controls, the image's alt text as its `aria-label`, and the GIF as an `<img>` fallback inside it, and the site carries `x.webm`, `x.gif` and `poster.png` under `docs/demo-video/clips/x/`

### Scenario S2 (boundary): No WebM beside the GIF

- GIVEN a page image of `docs/demo-video/clips/x/x.gif` and no `x.webm` in that folder
- WHEN the site is built
- THEN the image stays an image

### Scenario S3 (boundary): A GIF outside the clips folder

- GIVEN a page image of a GIF that is not `docs/demo-video/clips/<clip>/<clip>.gif`
- WHEN the site is built
- THEN the image is unchanged

### Scenario S4 (boundary): No clips folder

- GIVEN a repository with no `docs/demo-video/clips/` folder
- WHEN the site is built
- THEN the build passes and the site holds no clip folder

### Verification notes

- Method: Unit tests in test/site/siteClips.test.ts: the `<video>` markup, the callback for existing files, the copied media, the shipped docs/user/settings.md page.
- Criteria: The nominal page holds the `<video>` with every attribute and its fallback; the boundary cases leave the image or the build untouched; only the WebM, the GIF and the poster of a clip are copied.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-008](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-008.md): A reviewer reads the published site and its requirements
<!-- okf:links:end -->
