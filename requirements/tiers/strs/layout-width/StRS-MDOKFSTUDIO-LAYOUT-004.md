---
type: StRS
id: StRS-MDOKFSTUDIO-LAYOUT-004
uuid: 013beb81-67c8-4cb7-a324-7b57ff9a1459
title: The first element starts clear of the top and of the floating toolbar
description: When a document opens, in read or edit mode, the Studio SHALL start
  its first element, whatever it is, at a uniform distance below the top of the
  pane, and keep that element's controls reachable when the floating toolbar
  would cover it, by giving up width or moving it down only as far as needed.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: proposed
origin: native
tier: StRS
derives_from: []
user_need: As a reader or writer, I see every document start at the same
  comfortable distance below the top, whether it opens with text, a heading, a
  table, a picture, an admonition, properties or an empty page, and I can click
  the first block editor, the Start writing button and the properties controls
  at any pane width without the floating toolbar covering them.
derived_by:
- SwRS-MDOKFSTUDIO-LAYOUT-007
- SwRS-MDOKFSTUDIO-LAYOUT-008
- SwRS-MDOKFSTUDIO-LAYOUT-009
- SwRS-MDOKFSTUDIO-LAYOUT-010
- SwRS-MDOKFSTUDIO-LAYOUT-011
- SwRS-MDOKFSTUDIO-LAYOUT-012
- SwRS-MDOKFSTUDIO-LAYOUT-013
- SwRS-MDOKFSTUDIO-LAYOUT-014
- SwRS-MDOKFSTUDIO-LAYOUT-015
- SwRS-MDOKFSTUDIO-LAYOUT-016
- SwRS-MDOKFSTUDIO-LAYOUT-017
- SwRS-MDOKFSTUDIO-LAYOUT-018
- SwRS-MDOKFSTUDIO-LAYOUT-019
- SwRS-MDOKFSTUDIO-LAYOUT-037
- SwRS-MDOKFSTUDIO-LAYOUT-042
default_owner_email: gaetan@xeberon.net
supersedes:
- StRS-MDOKFSTUDIO-LAYOUT-005
---

## The first element starts clear of the top and of the floating toolbar

### Normative behavior

When a document opens, in read or edit mode, the Studio SHALL start its first element, whatever it is, at a uniform distance below the top of the pane, and keep that element's controls reachable when the floating toolbar would cover it, by giving up width or moving it down only as far as needed.

### Preserved stakeholder intent

As a reader or writer, I see every document start at the same comfortable distance below the top, whether it opens with text, a heading, a table, a picture, an admonition, properties or an empty page, and I can click the first block editor, the Start writing button and the properties controls at any pane width without the floating toolbar covering them.

### Rationale and constraints

- The gap is 40 px (within 4 px) for a paragraph, h1, h2, h3, table, image, admonition, properties table and schema properties table, in read mode and in edit mode, in light and dark.
- The gap is a top margin of the first child, so the text column itself never moves.
- The open first-block editor, with its edition palette on top, and the Start writing button of an empty document keep the same 40 px.
- Earlier values (56 px for the first-block editor, 24 px for Start writing) are superseded by the uniform 40 px.
- Where the toolbar sits beside the column (wide panes such as 900 and 1600 px) nothing is added and the first element keeps exactly the 40 px gap.
- In a wide pane the first-block editor keeps its 40 px by giving up the width the toolbar covers; the Start writing button is pushed down only when the button itself sits under the toolbar.
- In a narrow pane (480 px or less, down to 360 px) an interactive first element the toolbar would cover is pushed down just far enough to clear it; a leading properties table gives up width for a right-aligned Description toggle and is pushed down for a left-aligned badge or link.
- The clearance is measured again after a resize, a content or toolbar change, a toolbar collapse, a web font load and the next animation frames until quiet, throttled to avoid a burst of updates.
- The page publishes the toolbar's bottom edge so that the edition palette sticks below the toolbar only where the toolbar shares space with the column.
- Known issue: CHANGELOG entry 0.2.1 still quotes the superseded margins.
- Known issue: the 480 px limit between wide and narrow is a rule of the visual tests only; the code decides by overlap with the toolbar and a 320 px minimum frame width, so a 481 px pane with a long toolbar could also push content down.
