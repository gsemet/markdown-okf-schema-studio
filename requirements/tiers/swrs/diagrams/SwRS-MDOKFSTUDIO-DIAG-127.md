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
- StRS-MDOKFSTUDIO-DIAG-015
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/pageInput.ts
tested_in_files:
- test/page/diagReq.svgClick.requirements.test.ts
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
- Method: test/page/diagReq.svgClick.requirements.test.ts (in edit mode a click on an svg picture asks the host for the source of the block that holds it; in reading mode a click on an svg picture opens no editor) runs the click handler of src/page/features/pageInput.ts in the runtime harness: a click on the svg inside a mapped figure posts previewEditOpen with the first and last line of the figure, and in reading mode only previewReveal.
- Criteria: A picture is edited like any other mapped block.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-015](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-015.md): A writer reads charts and drawings in the page
<!-- okf:links:end -->
