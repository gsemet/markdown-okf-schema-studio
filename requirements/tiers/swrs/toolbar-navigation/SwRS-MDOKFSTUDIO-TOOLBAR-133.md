---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-133
uuid: 1fd2d293-ff23-45d9-9358-7d5a601ff03b
title: The narrow-pane rail keeps the text and the other Escape handlers clear
description: When the table of contents is open on a pane narrower than 760
  pixels, the extension SHALL reserve 16 pixels at the end of the content for
  the rail, place the overlay 40 pixels lower than the column top so that it
  stays clear of the open toolbar tooltip, and close the overlay on Escape only
  when the key comes from the overlay, the rail or no focused element and no
  other handler consumed it.
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-006
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/contentLayoutStyles.ts
- src/page/modules/tocColumn.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/page/modules/tocColumn.test.ts
- test/visual/capture_toc_rail.py
default_owner_email: gaetan@xeberon.net
---

## The narrow-pane rail keeps the text and the other Escape handlers clear

### Normative behavior

When the table of contents is open on a pane narrower than 760 pixels, the extension SHALL reserve 16 pixels at the end of the content for the rail, place the overlay 40 pixels lower than the column top so that it stays clear of the open toolbar tooltip, and close the overlay on Escape only when the key comes from the overlay, the rail or no focused element and no other handler consumed it.

### Scenario (nominal): Content padded for the rail

- GIVEN a 460 px pane with the table of contents on
- WHEN the page is measured
- THEN the content column ends 16 px before the pane edge, so the rail never covers text, and a 900 px pane keeps its 256 px reserve

### Scenario (nominal): Overlay clear of the tooltip

- GIVEN a 460 px pane, the rail hovered, and the toolbar tooltip of the TOC button open
- WHEN the overlay is placed
- THEN the overlay top is 40 px below the column top variable and lies below the bottom of the tooltip

### Scenario (boundary): Escape belongs to its owner

| Input | Outcome |
| --- | --- |
| Overlay open, Escape typed in the text or in a field (target outside the overlay and the rail) | The overlay stays open and the key is not prevented |
| Overlay open, Escape already consumed by another handler | The overlay stays open |
| Overlay open, Escape typed in the overlay, on the rail, or with no focused element (body) | The overlay closes at once and the key is prevented |

### Verification notes

- Method: test/page/modules/tocColumn.test.ts (Escape typed elsewhere than on the overlay is left to the handler that owns it).
- Method: test/core/preview/previewStyles.test.ts (a narrow pane pads the content for the 16px rail: the reserve variable, the body padding, the overlay 40 px offset).
- Method: test/visual/capture_toc_rail.py (check_toc_rail: content padding of 16 px and the overlay below the tooltip of the TOC button, scenarios toolbar-navigation/v28 and v29).
- Criteria: --sphinx-preview-toc-reserve is 16px under 760 px with the TOC on and body padding-inline-end equals it; overlay inset-block-start is the top variable plus 40px; Escape closes only for a target inside the overlay or rail, or the body, and not when defaultPrevented.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-006](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-006.md): The reader uses a table of contents beside the document
<!-- okf:links:end -->
