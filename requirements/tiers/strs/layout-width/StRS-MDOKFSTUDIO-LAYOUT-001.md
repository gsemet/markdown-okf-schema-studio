---
type: StRS
id: StRS-MDOKFSTUDIO-LAYOUT-001
uuid: 456ca960-d029-4fd4-a54b-0e064757c01d
title: The preview never scrolls sideways
description: When a document holds wide content, long words or long URLs, the
  Studio SHALL keep the preview page free of sideways scrolling in every width
  mode, theme and pane width.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a reader, I never have to scroll the whole page sideways to read a
  document, whatever its content, theme or the size of the pane.
derived_by:
- SwRS-MDOKFSTUDIO-LAYOUT-001
---

## The preview never scrolls sideways

### Normative behavior

When a document holds wide content, long words or long URLs, the Studio SHALL keep the preview page free of sideways scrolling in every width mode, theme and pane width.

### Preserved stakeholder intent

As a reader, I never have to scroll the whole page sideways to read a document, whatever its content, theme or the size of the pane.

### Rationale and constraints

- Holds in Margin, Auto and Full width, in light, dark and forced cream themes, and in panes from 360 to 2000 px wide (code: `CONTENT_LAYOUT_CSS` in `src/core/preview/styles/contentLayoutStyles.ts`).
- A wide block scrolls or widens inside its own box or breaks out within the pane; long words and bare URLs wrap (`overflow-wrap: anywhere`).
- Covers every visual scenario, including the GitHub Flavored Markdown gallery (five alerts, strikethrough, footnotes, task checkboxes, right-aligned column, raw HTML table, details, autolink) in dark and light at 900 px and light at 460 px; the gallery's atomic parts belong to the gfm scope.
- Known issue: this is a page-wide promise that no documentation states; it is only locked by visual checks (no sideways scroll) and the wrapping unit test.
