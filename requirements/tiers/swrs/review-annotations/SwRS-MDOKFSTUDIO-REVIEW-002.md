---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-002
uuid: 43142db6-5641-47ef-9c24-fb414bac828d
title: Comment thread text stays readable on every theme
description: When a review comment thread is shown in the preview in the Dark,
  White or Cream theme mode, the extension SHALL draw its author, date, text,
  placeholder and button text with a contrast of at least 4.5 to 1 on their
  surface, without dimming text through opacity.
project: markdown-okf-schema-studio
scope: review-annotations
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/commentStyles.ts
- src/core/preview/styles/pageChromeStyles.ts
tested_in_files:
- test/core/preview/commentContrast.test.ts
- test/integration/commentContrastWindow.ts
- test/visual/scenarioDefinitions1.ts
default_owner_email: gaetan@xeberon.net
---

## Comment thread text stays readable on every theme

### Normative behavior

When a review comment thread is shown in the preview in the Dark, White or Cream theme mode, the extension SHALL draw its author, date, text, placeholder and button text with a contrast of at least 4.5 to 1 on their surface, without dimming text through opacity.

### Scenario (nominal): Palette pairs

- GIVEN the Dark, White and Cream palettes of the preview
- WHEN the comment text colours (widget foreground, description, editor foreground, input foreground, button and secondary button text, thread green) are compared with their surfaces
- THEN every pair reaches 4.5 to 1

### Scenario (boundary): Cream page under a dark host theme

- GIVEN the Cream mode forced while the VS Code theme is dark
- WHEN a comment popover is opened
- THEN its text uses the palette's own widget foreground, never the host's, so it stays dark on the cream surface

### Scenario (boundary): No dimming

- GIVEN the comment popover, the compose box, the orphaned comments box and the thread panel
- WHEN their stylesheet rules are read
- THEN the date, quote, meta line and placeholder take the description colour at full strength, and only disabled buttons and the resolved badge use opacity

### Verification notes

- Method: test/core/preview/commentContrast.test.ts, unit tests `comment thread text reaches WCAG AA 4.5:1 on its surface in every theme mode` and `the comment popover and boxes never dim their text with opacity`.
- Criteria: Every computed ratio is at least 4.5. No text rule of the comment boxes sets opacity.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-003](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-003.md): A reviewer comments, replies, resolves and deletes, and no comment is lost
<!-- okf:links:end -->
