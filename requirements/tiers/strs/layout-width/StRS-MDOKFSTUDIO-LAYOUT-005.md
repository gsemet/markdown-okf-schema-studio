---
type: StRS
id: StRS-MDOKFSTUDIO-LAYOUT-005
uuid: 99f2a8ca-318f-4de7-8c5e-28db08527cb7
title: Nothing clickable hides under the floating toolbar
description: When the floating toolbar would cover the first element of a
  document, the Studio SHALL keep that element's controls reachable by giving up
  width or moving it down only as far as needed.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: superseded
origin: native
tier: StRS
annotation_exemption: true
exemption_reason: "Superseded by StRS-MDOKFSTUDIO-LAYOUT-004; no marker expected."
derives_from: []
user_need: As a writer, I can click the first block editor, the Start writing
  button and the properties controls at any pane width without the floating
  toolbar covering them.
derived_by: []
superseded_by: StRS-MDOKFSTUDIO-LAYOUT-004
---

## Nothing clickable hides under the floating toolbar

### Normative behavior

When the floating toolbar would cover the first element of a document, the Studio SHALL keep that element's controls reachable by giving up width or moving it down only as far as needed.

### Preserved stakeholder intent

As a writer, I can click the first block editor, the Start writing button and the properties controls at any pane width without the floating toolbar covering them.

### Rationale and constraints

- Where the toolbar sits beside the column (wide panes such as 900 and 1600 px) nothing is added and the first element keeps exactly the 40 px gap (`measure` in `src/page/modules/firstClearance.ts`).
- In a wide pane the first-block editor keeps its 40 px by giving up the width the toolbar covers; the Start writing button is pushed down only when the button itself sits under the toolbar.
- In a narrow pane (480 px or less, down to 360 px) an interactive first element the toolbar would cover is pushed down just far enough to clear it; a leading properties table gives up width for a right-aligned Description toggle and is pushed down for a left-aligned badge or link.
- The clearance is measured again after a resize, a content or toolbar change, a toolbar collapse, a web font load and the next animation frames until quiet, throttled to avoid a burst of updates.
- The page publishes the toolbar's bottom edge so that the edition palette sticks below the toolbar only where the toolbar shares space with the column.
- Known issue: the 480 px limit between wide and narrow is a rule of the visual tests only; the code decides by overlap with the toolbar and a 320 px minimum frame width, so a 481 px pane with a long toolbar could also push content down.
