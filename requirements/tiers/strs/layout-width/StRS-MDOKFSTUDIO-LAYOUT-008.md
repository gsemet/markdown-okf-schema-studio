---
type: StRS
id: StRS-MDOKFSTUDIO-LAYOUT-008
uuid: f818fe3d-06ff-46ff-a1a2-289c23ab5046
title: Margin and Full width modes frame the content predictably
description: When the width mode is Margin or Full width, the Studio SHALL keep
  blocks inside the text column in Margin and give the page the full pane with
  small side margins in Full width, centring narrow blocks in every mode.
project: markdown-okf-schema-studio
scope: layout-width
req_lifecycle: superseded
status: deprecated
origin: native
tier: StRS
derives_from: []
user_need: As a reader, I can rely on Margin to keep everything in a readable
  column, on Full width to use the whole pane, and on narrow tables and figures
  being centred in all modes.
derived_by: []
superseded_by:
- StRS-MDOKFSTUDIO-LAYOUT-003
default_owner_email: gaetan@xeberon.net
---

## Margin and Full width modes frame the content predictably

### Normative behavior

When the width mode is Margin or Full width, the Studio SHALL keep blocks inside the text column in Margin and give the page the full pane with small side margins in Full width, centring narrow blocks in every mode.

### Preserved stakeholder intent

As a reader, I can rely on Margin to keep everything in a readable column, on Full width to use the whole pane, and on narrow tables and figures being centred in all modes.

### Rationale and constraints

- Margin keeps tables, code blocks and figures inside the text column; they scroll or wrap instead of leaving it.
- Full width removes the column limit and gives the page and wide blocks the same 16 px side margins as a table that breaks out in Auto; text, tables, code blocks and figures are centred with at least 15 px gutters (`html[data-sphinx-preview-width="full"]` in `src/core/preview/styles/contentLayoutStyles.ts`).
- In every mode a table or figure narrower than the column is centred at its own width, a narrow figure and its caption are centred under the picture, a paragraph holding only an image is marked as a figure, and code blocks stay left with their width.
- Known issue: some visual scenario titles (`v05`, `v06` "full") do not match what they assert.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Superseded by:
  - [StRS-MDOKFSTUDIO-LAYOUT-003](StRS-MDOKFSTUDIO-LAYOUT-003.md): A reader chooses how wide the text column is
<!-- okf:links:end -->
