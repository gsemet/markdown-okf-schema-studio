---
type: StRS
id: StRS-MDOKFSTUDIO-THEME-011
uuid: 83e5bfc4-095c-4274-97a5-8fab82acec17
title: A reader zooms the text and the column and keeps the zoom
description: When the reader presses Zoom in or Zoom out, the Studio SHALL scale
  the text and the content column together between 70 % and 200 % in steps of 10
  points, keep the reading position, and remember the zoom for the workspace and
  for the panel.
project: markdown-okf-schema-studio
scope: theme-zoom
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a reader, I enlarge or shrink the text with two buttons, the
  column grows or shrinks with it, I always see the zoom the next click gives,
  and I stay on the text I was reading; I set the text size once and the
  previews of this workspace open at that size, also after reloading the window
  or closing and reopening the preview.
derived_by:
- SwRS-MDOKFSTUDIO-LIFE-169
- SwRS-MDOKFSTUDIO-LIFE-170
- SwRS-MDOKFSTUDIO-THEME-038
- SwRS-MDOKFSTUDIO-THEME-043
- SwRS-MDOKFSTUDIO-THEME-055
- SwRS-MDOKFSTUDIO-TOOLBAR-013
- SwRS-MDOKFSTUDIO-TRUST-006
---

## A reader zooms the text and the column and keeps the zoom

### Normative behavior

When the reader presses Zoom in or Zoom out, the Studio SHALL scale the text and the content column together between 70 % and 200 % in steps of 10 points, keep the reading position, and remember the zoom for the workspace and for the panel.

### Preserved stakeholder intent

As a reader, I enlarge or shrink the text with two buttons, the column grows or shrinks with it, I always see the zoom the next click gives, and I stay on the text I was reading; I set the text size once and the previews of this workspace open at that size, also after reloading the window or closing and reopening the preview.

### Rationale and constraints

- The buttons are on toolbar row 2; the range 70 to 200 % is stated in the CHANGELOG, docs/user/toolbar.md only lists the buttons.
- Zoom starts at 100 %. At 70 % or 200 % the matching button is disabled.
- The toolbar buttons keep their size; only the content text, the heading band text and the column scale.
- The page never scrolls sideways at any zoom (layout-width requirements).
- Precedence at start: the zoom saved with the panel, then the zoom stored for the workspace, then 100 %.
- A zoom change does not draw the document again.
- A zoom that VS Code cannot save still holds until the window closes.
