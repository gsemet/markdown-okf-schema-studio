---
type: StRS
id: StRS-MDOKFSTUDIO-LAYOUT-001
uuid: 456ca960-d029-4fd4-a54b-0e064757c01d
title: The preview never scrolls sideways and wide content scrolls in its box
description: When a document holds wide content, long words or long URLs, the
  Studio SHALL keep the preview page free of sideways scrolling in every width
  mode, theme and pane width, letting a table wider than the pane scroll
  sideways inside its own box.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: approved
approved_by: gaetan@xeberon.net
approved_on: 2026-10-28
origin: native
tier: StRS
derives_from: []
user_need: As a reader, I never have to scroll the whole page sideways to read a
  document, whatever its content, theme or the size of the pane; I reach every
  column of a wide table without the page moving, I can tell there is more to
  scroll to, and short identifiers stay readable. As a maintainer, I can run
  machine layout checks on any preview and trust that they flag real layout
  defects and stay quiet on pages where they do not apply.
derived_by:
- SwRS-MDOKFSTUDIO-LAYOUT-001
- SwRS-MDOKFSTUDIO-LAYOUT-032
- SwRS-MDOKFSTUDIO-LAYOUT-033
- SwRS-MDOKFSTUDIO-LAYOUT-034
- SwRS-MDOKFSTUDIO-LAYOUT-035
default_owner_email: gaetan@xeberon.net
supersedes:
- StRS-MDOKFSTUDIO-LAYOUT-002
- StRS-MDOKFSTUDIO-LAYOUT-009
---

## The preview never scrolls sideways and wide content scrolls in its box

### Normative behavior

When a document holds wide content, long words or long URLs, the Studio SHALL keep the preview page free of sideways scrolling in every width mode, theme and pane width, letting a table wider than the pane scroll sideways inside its own box.

### Preserved stakeholder intent

As a reader, I never have to scroll the whole page sideways to read a document, whatever its content, theme or the size of the pane; I reach every column of a wide table without the page moving, I can tell there is more to scroll to, and short identifiers stay readable. As a maintainer, I can run machine layout checks on any preview and trust that they flag real layout defects and stay quiet on pages where they do not apply.

### Rationale and constraints

- Holds in Margin, Auto and Full width, in light, dark and forced cream themes, and in panes from 360 to 2000 px wide.
- A wide block scrolls or widens inside its own box or breaks out within the pane; long words and bare URLs wrap.
- Covers every visual scenario, including the GitHub Flavored Markdown gallery (five alerts, strikethrough, footnotes, task checkboxes, right-aligned column, raw HTML table, details, autolink) in dark and light at 900 px and light at 460 px; the gallery's atomic parts belong to the gfm scope.
- A table wider than the pane scrolls inside its own box (maximum width 100% of the column, horizontal scroll), for example a service-level table at 460 px and a sixteen-column table at 900 px, both reaching their far-right column.
- The shading of overflowing edges and the single-line effect on short identifiers (one word of at most 24 characters, such as `nw-02` or `North`) apply only while the table overflows by more than 1 px, stop when the table fits, and never apply to the properties table.
- In Auto width a table wider than the column breaks out of it instead; that case belongs to the width-modes use case.
- The layout checks are tooling and have no user-visible effect; they report four ids: `overlay-covers-text`, `overlay-clipped`, `identifier-split` and `status-two-lines`.
- Each layout check is not applicable, hence passing, when the page has no matching DOM; `identifier-split` flags only a cell whose own text node wraps over several lines.
- Known issue: this is a page-wide promise that no documentation states; it is only locked by visual checks (no sideways scroll) and the wrapping unit test.
- Known issue: the layout-check behaviour is undocumented outside its unit test.
