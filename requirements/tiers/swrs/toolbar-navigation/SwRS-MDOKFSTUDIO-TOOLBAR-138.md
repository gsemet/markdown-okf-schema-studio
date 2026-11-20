---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-138
uuid: da165d72-cc0d-4f45-a1c7-316d5a7fb778
title: The column lists the items of top-level lists when a setting asks
description: While the preview.listItemsInToc setting is on, when the column is
  built, the extension SHALL list each item of a top-level list of the content
  container whose first line holds a letter or a digit, by that first line cut
  to 80 characters, in document order, one level below the heading that precedes
  it, without a rail tick.
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-006
depends_on:
- SwRS-MDOKFSTUDIO-TOOLBAR-040
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/configuration/settingsRegistry.ts
- src/page/modules/tocColumn.ts
tested_in_files:
- test/core/configuration/previewConfiguration.test.ts
- test/core/configuration/settingsRegistry.test.ts
- test/page/modules/tocColumn.test.ts
default_owner_email: gaetan@xeberon.net
---

## The column lists the items of top-level lists when a setting asks

### Normative behavior

While the preview.listItemsInToc setting is on, when the column is built, the extension SHALL list each item of a top-level list of the content container whose first line holds a letter or a digit, by that first line cut to 80 characters, in document order, one level below the heading that precedes it, without a rail tick.

Some documents write each requirement, rule or record as a list item, with no heading of its own: their table of contents shows the headings only, sometimes the document title alone. This option lists the list items too.

- An item of a top-level list is an item of a list that is not inside another list item; the items of a nested list are not listed.
- The entry reads as the first line of the item (its first paragraph, or its own text in a tight list), runs of white space collapsed; a line longer than 80 characters is cut to its first 79 characters, then `…`.
- An item whose first line holds no letter and no digit (`-`, `—`) is not listed.
- Its level is the level of the nearest heading before it plus one, or 1 before any heading; the indent of its row follows the rules of the headings (SwRS-MDOKFSTUDIO-TOOLBAR-040).
- An item inside a properties table, an admonition, a block editor or the sticky band is left out, like a heading there; so is an item of the list that a `[TOC]` marker generates, of the footnotes, of a table cell or of a hidden element (a tab panel not shown).
- An item is always a leaf: it gets no twisty, and a heading after it, even a deeper one, belongs to the heading before the item.
- The item has no tick on the rail; at the reading line, the item is marked current in the column and the rail marks the tick of its section.
- A click on the item scrolls to it, as a click on a heading does.

`markdownOkfSchemaStudio.preview.listItemsInToc` is a boolean of resource scope, off by default. The page reads it once at startup from its boot context: a missing or non-boolean value reads as off, and a change of the setting reloads the page content.

### Scenario (nominal): Items under their heading

- GIVEN the setting on and a content container holding a list with the item `Before any heading`, then `# Braking`, then a list with `[SRS_0001] Brake on demand` (which holds a nested list with `a nested item`), `-` and an item whose first line is 101 characters long, then `## Release` and an ordered list with `Release   on demand`
- WHEN the column is built
- THEN it lists `Before any heading` (level 1), `Braking` (1), `[SRS_0001] Brake on demand` (2), the long line cut to 79 characters and `…` (2), `Release` (2) and `Release on demand` (3); the rail holds the two ticks Braking and Release; a click on `[SRS_0001] Brake on demand` scrolls to its list item

### Scenario (boundary): Items that are not listed

| Item | Listed |
| --- | --- |
| `- a nested item` inside another item | no: not an item of a top-level list |
| `- -` | no: its first line holds no letter or digit |
| an item whose first line is longer than 80 characters | yes, cut to 79 characters and `…` |
| an item of the `[TOC]` list, of the footnotes, of a table cell or of a hidden tab panel | no |

### Scenario (boundary): A heading deeper than the items after them

- GIVEN the setting on and a content container holding the item `Before any heading`, then `## Overview`, `# Top`, a list with `First` and `Second`, then `### Deep`
- WHEN the column is built, then the writer folds Top
- THEN no item has a twisty, Top is the only entry with one, and folding Top hides `First`, `Second` and Deep

### Scenario (nominal): The reading line at an item

- GIVEN the setting on, `# Braking` at 100 px, a list item `Brake on demand` at 300 px and `## Release` at 900 px
- WHEN the reading line is at 340 px
- THEN the item `Brake on demand` carries aria-current location and the rail marks the tick of Braking

### Scenario (boundary): The setting is off, the default

- GIVEN the chapter of the nominal scenario and the setting off or absent from the boot context
- WHEN the column is built
- THEN it lists the headings only, Braking and Release, as SwRS-MDOKFSTUDIO-TOOLBAR-040 specifies

### Verification notes

- Method: test/page/modules/tocColumn.test.ts (`with listItemsInToc on, top-level list items are listed one level below their heading, without a tick`: nominal scenario and the boundary table; `a list item is a leaf: a deeper heading after it belongs to the heading before the item`: deeper heading scenario; `at a list item, the TOC marks the item and the rail marks the tick of its section`: reading line scenario; `with listItemsInToc off or absent, the default, the TOC lists the headings only`: setting off scenario; `the generated [TOC] list, footnotes, table cells and hidden panels are not listed`: the last row of the boundary table). The page runs in the fake DOM of that file; `on a rendered page, the items of the [TOC] list, of the footnotes and of a table cell are not listed` copies into it a page rendered from Markdown by the real renderer (`renderMappedPage` of test/session/mappedHtmlDom.ts), so the `nav.okf-toc` and `section.footnotes` selectors are checked against the markup the renderer emits (the last row of the boundary table, hidden panels excepted).
- Method: test/core/configuration/settingsRegistry.test.ts and test/core/configuration/previewConfiguration.test.ts: the default (off), the boot read of a missing or odd value, and the startup setting list.
- Method: no visual or real-window scenario covers the list items in the column.
- Criteria: `collect` (src/page/modules/tocColumn.ts) reads `h1, h2, h3, h4, li` only when the setting is on, skips a list item whose parent is inside another list item or that is inside `LIST_ITEM_EXCLUDED` (`nav.okf-toc, section.footnotes, table, [hidden]`), and keeps it only when `listItemText` gives a first line with a letter or a digit, cut to `LIST_ITEM_TEXT_LIMIT` (80) characters; the item level is the level of the heading before it plus one (1 when no heading came before); the parent of a row skips the list items before it, a list item never gets a twisty or a tick, and `tickFor` gives the nearest tick before it.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-006](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-006.md): The reader uses a table of contents beside the document
- Depends on:
  - [SwRS-MDOKFSTUDIO-TOOLBAR-040](SwRS-MDOKFSTUDIO-TOOLBAR-040.md): The column lists the h1 to h4 headings with folding
<!-- okf:links:end -->
