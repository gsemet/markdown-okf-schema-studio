---
type: StRS
id: StRS-MDOKFSTUDIO-LAYOUT-002
uuid: 0450ef67-aa18-4a94-9cd9-801b0098324c
title: Wide tables scroll inside their own box
description: When a table is wider than the pane, the Studio SHALL let it scroll
  sideways inside its own box, shading the overflowing edges and keeping short
  identifiers on one line.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: superseded
origin: native
tier: StRS
annotation_exemption: true
exemption_reason: "Superseded by StRS-MDOKFSTUDIO-LAYOUT-001; no marker expected."
derives_from: []
user_need: As a reader, I reach every column of a wide table without the page
  moving, I can tell there is more to scroll to, and short identifiers stay
  readable.
derived_by: []
superseded_by: StRS-MDOKFSTUDIO-LAYOUT-001
default_owner_email: gaetan@xeberon.net
---

## Wide tables scroll inside their own box

### Normative behavior

When a table is wider than the pane, the Studio SHALL let it scroll sideways inside its own box, shading the overflowing edges and keeping short identifiers on one line.

### Preserved stakeholder intent

As a reader, I reach every column of a wide table without the page moving, I can tell there is more to scroll to, and short identifiers stay readable.

### Rationale and constraints

- A table wider than the pane scrolls inside its own box (maximum width 100% of the column, horizontal scroll), for example a service-level table at 460 px and a sixteen-column table at 900 px, both reaching their far-right column (`src/core/preview/styles/contentBlockStyles.ts`).
- The shading of overflowing edges and the single-line effect on short identifiers (one word of at most 24 characters, such as `nw-02` or `North`) apply only while the table overflows by more than 1 px, stop when the table fits, and never apply to the properties table (`markWideTables` in `src/page/features/scrollCore.ts`).
- In Auto width a table wider than the column breaks out of it instead; that case belongs to the Auto width use case.
