---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-127
uuid: 3914cf21-3f34-4fe6-a529-8b138a558d04
title: A click on a picture opens its source editor
description: When the writer clicks an svg picture in edit mode, the preview
  SHALL open the source editor of the block that holds it, as it does for a
  Mermaid diagram.
project: MDOKFSTUDIO
scope: diagrams
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/svgPictures.ts
tested_in_files:
- test/visual/svgPictureScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## A click on a picture opens its source editor

### Normative behavior

When the writer clicks an svg picture in edit mode, the preview SHALL open the source editor of the block that holds it, as it does for a Mermaid diagram.

### Scenario (nominal): A click opens the editor

- GIVEN edit mode on and a page with an svg picture
- WHEN the writer clicks the picture
- THEN the source editor of the block that holds it opens over the figure, with the lines of the fence or of the raw svg

### Scenario (boundary): The picture is a mapped block

- GIVEN an svg fence or a raw svg block
- WHEN the preview renders it
- THEN its figure carries data-line and data-end-line, which is what the click uses

### Verification notes

- Method: test/core/render/svgRendering.test.ts (the lines of the figure)
- Method: the visual scenario diagrams/v22 (a click opens the source editor)
- Criteria: A picture is edited like any other mapped block.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-001](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-001.md): A writer reads and inserts Mermaid diagrams that follow the theme
<!-- okf:links:end -->
