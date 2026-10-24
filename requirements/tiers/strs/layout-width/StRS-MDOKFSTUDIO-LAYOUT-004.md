---
type: StRS
id: StRS-MDOKFSTUDIO-LAYOUT-004
uuid: 013beb81-67c8-4cb7-a324-7b57ff9a1459
title: The first element starts below the top
description: When a document opens, in read or edit mode, the Studio SHALL start
  its first element, whatever it is, at a uniform distance below the top of the
  pane.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a reader or writer, I see every document start at the same
  comfortable distance below the top, whether it opens with text, a heading, a
  table, a picture, an admonition, properties or an empty page.
derived_by:
- SwRS-MDOKFSTUDIO-LAYOUT-007
- SwRS-MDOKFSTUDIO-LAYOUT-008
- SwRS-MDOKFSTUDIO-LAYOUT-009
- SwRS-MDOKFSTUDIO-LAYOUT-010
---

## The first element starts below the top

### Normative behavior

When a document opens, in read or edit mode, the Studio SHALL start its first element, whatever it is, at a uniform distance below the top of the pane.

### Preserved stakeholder intent

As a reader or writer, I see every document start at the same comfortable distance below the top, whether it opens with text, a heading, a table, a picture, an admonition, properties or an empty page.

### Rationale and constraints

- The gap is 40 px (within 4 px) for a paragraph, h1, h2, h3, table, image, admonition, properties table and schema properties table, in read mode and in edit mode, in light and dark (`#sphinx-myst-preview-content > :first-child` in `src/core/preview/styles/contentLayoutStyles.ts`).
- The gap is a top margin of the first child, so the text column itself never moves.
- The open first-block editor, with its edition palette on top, and the Start writing button of an empty document keep the same 40 px.
- Earlier values (56 px for the first-block editor, 24 px for Start writing) are superseded by the uniform 40 px.
- Known issue: CHANGELOG entry 0.2.1 still quotes the superseded margins.
