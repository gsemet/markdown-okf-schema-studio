---
type: StRS
id: StRS-MDOKFSTUDIO-MYST-001
uuid: 1547ec65-6ae8-4b0d-9a47-f3bf5ec0c596
title: MyST directives and roles render as readable blocks
description: When a document uses MyST admonitions, context tags, definition
  lists, text roles, sized figures, grid cards or table directives, the Studio
  SHALL show each as a readable block in the preview without a Sphinx build.
project: markdown-okf-schema-studio
scope: myst
req_lifecycle: approved
status: stable
approved_by: gaetan@xeberon.net
approved_at: '2026-10-28T00:00:00Z'
verified:
  by: human:gaetan@xeberon.net
  at: '2026-10-28T00:00:00Z'
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I want these MyST constructs to look as readers will see
  them, without building, so that I can judge and lay out my document in VS
  Code.
derived_by:
- SwRS-MDOKFSTUDIO-CORE-012
- SwRS-MDOKFSTUDIO-CORE-045
- SwRS-MDOKFSTUDIO-CORE-056
- SwRS-MDOKFSTUDIO-CORE-057
- SwRS-MDOKFSTUDIO-CORE-058
- SwRS-MDOKFSTUDIO-CORE-059
- SwRS-MDOKFSTUDIO-CORE-061
- SwRS-MDOKFSTUDIO-CORE-063
- SwRS-MDOKFSTUDIO-GFM-031
- SwRS-MDOKFSTUDIO-MYST-001
- SwRS-MDOKFSTUDIO-MYST-002
- SwRS-MDOKFSTUDIO-MYST-003
- SwRS-MDOKFSTUDIO-MYST-004
- SwRS-MDOKFSTUDIO-MYST-005
- SwRS-MDOKFSTUDIO-MYST-006
- SwRS-MDOKFSTUDIO-MYST-007
- SwRS-MDOKFSTUDIO-MYST-008
- SwRS-MDOKFSTUDIO-MYST-009
- SwRS-MDOKFSTUDIO-MYST-010
- SwRS-MDOKFSTUDIO-MYST-011
- SwRS-MDOKFSTUDIO-MYST-012
- SwRS-MDOKFSTUDIO-MYST-013
- SwRS-MDOKFSTUDIO-MYST-014
- SwRS-MDOKFSTUDIO-MYST-015
- SwRS-MDOKFSTUDIO-MYST-016
- SwRS-MDOKFSTUDIO-MYST-017
- SwRS-MDOKFSTUDIO-MYST-018
- SwRS-MDOKFSTUDIO-MYST-031
- SwRS-MDOKFSTUDIO-MYST-032
- SwRS-MDOKFSTUDIO-MYST-033
- SwRS-MDOKFSTUDIO-MYST-034
- SwRS-MDOKFSTUDIO-MYST-035
- SwRS-MDOKFSTUDIO-MYST-052
- SwRS-MDOKFSTUDIO-MYST-053
- SwRS-MDOKFSTUDIO-MYST-054
- SwRS-MDOKFSTUDIO-MYST-055
- SwRS-MDOKFSTUDIO-MYST-056
- SwRS-MDOKFSTUDIO-MYST-063
- SwRS-MDOKFSTUDIO-MYST-064
- SwRS-MDOKFSTUDIO-MYST-065
- SwRS-MDOKFSTUDIO-MYST-087
- SwRS-MDOKFSTUDIO-MYST-088
- SwRS-MDOKFSTUDIO-MYST-091
- SwRS-MDOKFSTUDIO-MYST-092
- SwRS-MDOKFSTUDIO-MYST-093
- SwRS-MDOKFSTUDIO-MYST-095
- SwRS-MDOKFSTUDIO-MYST-098
- SwRS-MDOKFSTUDIO-MYST-099
- SwRS-MDOKFSTUDIO-MYST-100
default_owner_email: gaetan@xeberon.net
supersedes:
- StRS-MDOKFSTUDIO-MYST-002
- StRS-MDOKFSTUDIO-MYST-003
- StRS-MDOKFSTUDIO-MYST-008
- StRS-MDOKFSTUDIO-MYST-011
- StRS-MDOKFSTUDIO-MYST-013
---

## MyST directives and roles render as readable blocks

### Normative behavior

When a document uses MyST admonitions, context tags, definition lists, text roles, sized figures, grid cards or table directives, the Studio SHALL show each as a readable block in the preview without a Sphinx build.

### Preserved stakeholder intent

Writers want every admonition kind, custom title, dropdown and nesting to look like a distinct callout, pasted context tags to stay readable and inert, text constructs typeset, figure sizing reflected immediately, card layouts usable in narrow panes and all table directive forms to look like tables, so that they can review the document without building.

### Rationale and constraints

- Admonitions: applies to all ten named admonition kinds, custom titles, dropdowns and nesting, shown as a coloured callout with title and body; the same look holds in dark and light themes.
- Context tags: pasted prompt-style tags are shown as a readable panel, never executed as HTML and never losing content; unknown tags stay visible as text.
- Definition lists, subscript, superscript, abbreviations and keys are typeset in the preview without a Sphinx build.
- Figures: width and alignment follow what the source says.
- Grid cards reflow with the pane width rather than overflow sideways.
- List, caption and CSV table directives show as ordinary tables; content stays as authored in the source.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-CORE-012](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-012.md): An include is expanded in place and mapped to its directive
  - [SwRS-MDOKFSTUDIO-CORE-045](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-045.md): Expand alerts in included files and context tags
  - [SwRS-MDOKFSTUDIO-CORE-056](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-056.md): Rebuild raw HTML tables from an allow-list
  - [SwRS-MDOKFSTUDIO-CORE-057](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-057.md): Render list-table headers, widths and alignment
  - [SwRS-MDOKFSTUDIO-CORE-058](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-058.md): Edit a list-table as one block
  - [SwRS-MDOKFSTUDIO-CORE-059](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-059.md): Use a figure body as its caption
  - [SwRS-MDOKFSTUDIO-CORE-061](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-061.md): Render version admonitions
  - [SwRS-MDOKFSTUDIO-CORE-063](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-063.md): Keep figure width and alignment
  - [SwRS-MDOKFSTUDIO-GFM-031](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-031.md): Raw HTML tables are rebuilt from an allow-list
  - [SwRS-MDOKFSTUDIO-MYST-001](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-001.md): Admonitions render as coloured callouts with a title
  - [SwRS-MDOKFSTUDIO-MYST-002](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-002.md): Admonitions take an accent colour and badge by kind
  - [SwRS-MDOKFSTUDIO-MYST-003](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-003.md): Admonition galleries keep one title line per panel without sideways scroll
  - [SwRS-MDOKFSTUDIO-MYST-004](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-004.md): Custom admonitions show their written title and class colour
  - [SwRS-MDOKFSTUDIO-MYST-005](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-005.md): Untitled admonitions take their title from a leading bold line or heading
  - [SwRS-MDOKFSTUDIO-MYST-006](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-006.md): Admonitions nest, collapse and map as one block
  - [SwRS-MDOKFSTUDIO-MYST-007](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-007.md): A longer outer fence keeps inner fences as literal code
  - [SwRS-MDOKFSTUDIO-MYST-008](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-008.md): An admonition is one mapped block over its whole directive
  - [SwRS-MDOKFSTUDIO-MYST-009](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-009.md): Dropdown admonitions collapse under their title
  - [SwRS-MDOKFSTUDIO-MYST-010](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-010.md): Simple and icon-less admonitions drop their decoration
  - [SwRS-MDOKFSTUDIO-MYST-011](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-011.md): Version admonitions show their version title
  - [SwRS-MDOKFSTUDIO-MYST-012](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-012.md): Quarto callouts render as simple admonitions
  - [SwRS-MDOKFSTUDIO-MYST-013](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-013.md): Context tags render as titled panels
  - [SwRS-MDOKFSTUDIO-MYST-014](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-014.md): Nested context tags render as nested panels
  - [SwRS-MDOKFSTUDIO-MYST-015](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-015.md): Unpaired or non-context tags stay visible as text
  - [SwRS-MDOKFSTUDIO-MYST-016](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-016.md): Context tags group inside containers and split raw HTML blocks
  - [SwRS-MDOKFSTUDIO-MYST-017](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-017.md): Definition lists and inline roles are typeset
  - [SwRS-MDOKFSTUDIO-MYST-018](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-018.md): Inline roles sub, sup, abbr and kbd render
  - [SwRS-MDOKFSTUDIO-MYST-031](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-031.md): Figures render with image, caption, label, width and alignment
  - [SwRS-MDOKFSTUDIO-MYST-032](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-032.md): Figure images outside the document folder load
  - [SwRS-MDOKFSTUDIO-MYST-033](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-033.md): Figure width values are validated
  - [SwRS-MDOKFSTUDIO-MYST-034](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-034.md): The page applies figure widths through the CSSOM
  - [SwRS-MDOKFSTUDIO-MYST-035](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-035.md): Figure alignment sets align classes and float
  - [SwRS-MDOKFSTUDIO-MYST-052](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-052.md): The MyST gallery renders without sideways scroll
  - [SwRS-MDOKFSTUDIO-MYST-053](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-053.md): Grids lay out cards in responsive columns
  - [SwRS-MDOKFSTUDIO-MYST-054](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-054.md): Grid columns follow the pane width
  - [SwRS-MDOKFSTUDIO-MYST-055](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-055.md): Grid item cards show title, header, body, footer and link
  - [SwRS-MDOKFSTUDIO-MYST-056](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-056.md): Grids nest and keep absolute source lines
  - [SwRS-MDOKFSTUDIO-MYST-063](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-063.md): Table directives render as ordinary tables
  - [SwRS-MDOKFSTUDIO-MYST-064](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-064.md): Invalid list-table widths are ignored
  - [SwRS-MDOKFSTUDIO-MYST-065](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-065.md): The table directive renders a table with caption, id and alignment
  - [SwRS-MDOKFSTUDIO-MYST-087](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-087.md): Each admonition kind renders under its own directive name
  - [SwRS-MDOKFSTUDIO-MYST-088](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-088.md): The csv-table directive renders a table
  - [SwRS-MDOKFSTUDIO-MYST-091](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-091.md): The figure directive renders with its own styles and actions
  - [SwRS-MDOKFSTUDIO-MYST-092](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-092.md): The table directive family renders with its own styles and actions
  - [SwRS-MDOKFSTUDIO-MYST-093](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-093.md): A directive name registered twice is refused
  - [SwRS-MDOKFSTUDIO-MYST-095](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-095.md): Doc and download roles render as plain links
  - [SwRS-MDOKFSTUDIO-MYST-098](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-098.md): Tab sets render a tab bar with one panel shown at a time
  - [SwRS-MDOKFSTUDIO-MYST-099](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-099.md): Tabs follow the keyboard and the click
  - [SwRS-MDOKFSTUDIO-MYST-100](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-100.md): Standalone cards show header, title, body and footer
- Supersedes:
  - [StRS-MDOKFSTUDIO-MYST-002](StRS-MDOKFSTUDIO-MYST-002.md): Context tags render as readable panels
  - [StRS-MDOKFSTUDIO-MYST-003](StRS-MDOKFSTUDIO-MYST-003.md): Definition lists and inline text roles are typeset
  - [StRS-MDOKFSTUDIO-MYST-008](StRS-MDOKFSTUDIO-MYST-008.md): Figure width and alignment show in the preview
  - [StRS-MDOKFSTUDIO-MYST-011](StRS-MDOKFSTUDIO-MYST-011.md): Grid cards adapt to the pane width
  - [StRS-MDOKFSTUDIO-MYST-013](StRS-MDOKFSTUDIO-MYST-013.md): Table directives render as ordinary tables
<!-- okf:links:end -->
