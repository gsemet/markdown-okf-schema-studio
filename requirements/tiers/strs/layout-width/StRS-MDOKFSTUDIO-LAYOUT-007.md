---
type: StRS
id: StRS-MDOKFSTUDIO-LAYOUT-007
uuid: 571d8e0e-c76c-4e4c-9b19-0be2c170974e
title: Auto width lets wide content break out of the column
description: When the width mode is Auto, the Studio SHALL let tables, figures,
  images, code blocks and diagrams wider than the text column use the available
  width, centred and clear of the pane edges.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: superseded
origin: native
tier: StRS
annotation_exemption: true
exemption_reason: "Superseded by StRS-MDOKFSTUDIO-LAYOUT-003; no marker expected."
derives_from: []
user_need: As a reader, I see wide tables, pictures and diagrams in full when
  the pane has room, without turning the whole page to full width.
derived_by: []
superseded_by: StRS-MDOKFSTUDIO-LAYOUT-003
default_owner_email: gaetan@xeberon.net
---

## Auto width lets wide content break out of the column

### Normative behavior

When the width mode is Auto, the Studio SHALL let tables, figures, images, code blocks and diagrams wider than the text column use the available width, centred and clear of the pane edges.

### Preserved stakeholder intent

As a reader, I see wide tables, pictures and diagrams in full when the pane has room, without turning the whole page to full width.

### Rationale and constraints

- Applies to a table, figure, image, code block or Mermaid diagram wider than the column; elements not wider are left alone, and a gain of 1 px or less is ignored (`update` in `src/page/modules/widthMode.ts`).
- The element takes the width it needs up to the available area (the pane minus the open table-of-contents column minus a 16 px gutter on each side) and is centred on that area; with the table-of-contents column open its 256 px are excluded from the area, the centre and the cap.
- A wide table is measured without the cap and rounded up to the next pixel so that no cell wraps.
- An element under edit keeps the column width while its editor is open, and a figure sized in %, em or rem stays relative to the column; an image uses the author's pixel width before its intrinsic size.
- The wide elements are measured again after a content patch, a window or content resize, image load, toolbar collapse, table-of-contents toggle and when an element enters or leaves edit.
- Known issue: the paths for %/em/rem figures, declared pixel widths, the Mermaid wrapper and the 1 px tolerance are not directly tested, and no visual scenario combines the open table-of-contents column with Auto.
