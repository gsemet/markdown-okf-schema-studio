---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-260
uuid: 1b34c6d4-230d-4430-9f6f-8cb0b6e9e828
title: A card title or option opens on its own line
description: 'When the writer clicks the title of a grid card or of a card in edit
  mode, or the text of its :header: or :footer: option, the preview SHALL open the
  block editor on the directive line or on the option line that holds it, and show
  the title and the option text as inline text so that a leading number stays literal.'
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-003
scenarios:
- id: S1
  title: The numbered title of a grid card
- id: S2
  title: The header and footer options of a card
- id: S3
  title: A card with a link
- id: S4
  title: The one-line card parts are marked
- id: S5
  title: A grid card inside a quote
- id: S6
  title: A grid card inside a list item
annotation_exemption: false
exemption_reason:
derived_by: []
supersedes:
- SwRS-MDOKFSTUDIO-BLOCK-258
implemented_in_files:
- src/core/preview/styles/editModeStyles.ts
- src/core/render/mystGridToctree.ts
- src/core/security/html-sanitizer.ts
tested_in_files:
- test/core/render/gridCardTitleSourceLine.test.ts
- test/page/linkEditModeClick.test.ts
- test/security/html-policy.test.ts
- test/visual/gridCardEditingScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## A card title or option opens on its own line

### Normative behavior

When the writer clicks the title of a grid card or of a card, with or without a `:link:` option, in edit mode, the preview SHALL open the block editor on the directive line of that card (the `:::{grid-item-card}` or `:::{card}` line that holds the title), and when the writer clicks the text of its `:header:` or `:footer:` option, on that option's own line, rendering the title and the option text as inline text so that a leading "2." stays literal.

The renderer SHALL mark the title (a linked title too), the `:header:` text and the `:footer:` text as one-line card parts with `data-single-line`, never the body or a block found one-line by its line range, and the sanitizer SHALL keep that marker next to the source mapping.

### Scenario S1 (nominal): The numbered title of a grid card

- GIVEN edit mode on a document whose line 8 is `:::{grid-item-card} 2. Status projection`
- WHEN the writer clicks the title of that card
- THEN the title shows the text "2. Status projection" (the number is not turned into a list), the editor opens inside the card on line 8 and holds that directive line, and Done replaces line 8 only, never line 1 of the document; a plain title such as `Plain *title*` opens its directive line in the same way

### Scenario S2 (nominal): The header and footer options of a card

- GIVEN a `{card}` whose options are `:class-card: x` on line 4, `:header: 4. H` on line 5 and `:footer: 5. F` on line 6
- WHEN the writer clicks the header text, then the footer text
- THEN the header "4. H" opens the editor on line 5 only and the footer "5. F" on line 6 only, each shown as literal inline text with its number

### Scenario S3 (boundary): A card with a link

- GIVEN a `{card}` titled `3. Linked` with the option `:link: https://example.com`, or the grid card `:::{grid-item-card} Linked card` on line 14 with `:link: targets/alpha.md`, a header section, a body on line 19 and a footer on line 21
- WHEN the writer clicks the title, the header, the body or the footer in edit mode
- THEN the title is a link mapped to the directive line, like a plain title: a click on it opens the editor on line 3 (line 14 for the grid card) and does not follow the link; a click on the header, the body or the footer opens the editor on that part's own lines, because in edit mode the stretched link of the card no longer covers the card (SwRS-MDOKFSTUDIO-BLOCK-014)
- AND a Cmd or Ctrl click on the title follows the link and opens no editor; in reading mode a click anywhere on the card follows the link

### Scenario S4 (nominal): The one-line card parts are marked

- GIVEN a `{card}` with a title, `:header:` and `:footer:` options and a body, and the same card with a `:link:` option
- WHEN the renderer maps it and the sanitizer cleans the result
- THEN the title (linked or not), the header text and the footer text carry `data-single-line`, the body does not, and the sanitizer keeps the marker next to `data-line`

### Scenario S5 (boundary): A grid card inside a quote

- GIVEN a `{grid}` written inside a quote (`> ::::{grid} 2`) whose body starts with a blank `>` line, then `> :::{grid-item-card} A` and `> Body.`
- WHEN the writer clicks the card title or the card body in edit mode
- THEN the editor opens on that card's own directive line or body line, as for the same grid outside a quote, never on the line above

### Scenario S6 (boundary): A grid card inside a list item

- GIVEN a `{grid}` opened on a bullet or numbered list item line whose marker is followed by spaces or a tab (`- ::::{grid} 2`, `-<TAB>::::{grid} 2`) and whose body starts with a blank line, then the cards indented to the item's content column with spaces or tabs
- WHEN the writer clicks a card title or body in edit mode
- THEN the editor opens on that card's own directive line or body line, as for the same grid outside the list, never on the line above

### Related requirements

- SwRS-MDOKFSTUDIO-BLOCK-014: in edit mode the stretched link of a card no longer covers the card
- SwRS-MDOKFSTUDIO-MYST-100: the card and grid directives of the renderer
- SwRS-MDOKFSTUDIO-BLOCK-261: the editor opened on such a line takes Enter as done

### Verification notes

- Method: test/core/render/gridCardTitleSourceLine.test.ts renders the fixture and small documents, and checks the title text, the absence of list elements, the data-line of the title, of the header and of the footer option, and the linked title mapped to its directive line (`a card title with a link option maps to its directive line like a plain title`, `a linked grid card title maps to its directive line and keeps its link`); test/page/linkEditModeClick.test.ts checks that a click on the title, body and footer of a linked card opens lines 14, 19 and 21 and that a Cmd or Ctrl click on the title follows the link; the visual scenarios `block-editing/v25` and `v26` check that the open title editor holds the directive line, and `block-editing/v31` and `v32` (test/visual/linkEditModeScenarios.ts) that a real click on the footer of a linked card opens its editor inside the card. The reading mode row is not asserted by a dedicated test.
- Method: test/core/render/gridCardTitleSourceLine.test.ts renders quoted and unquoted grids and cards (blank first body line, one and two quote levels, backtick fence, `:gutter:`) and checks the `data-line` of the card, its title and its body (`a quoted grid whose body starts with a blank quoted line maps its card, title and body to their own lines`, `a doubly quoted grid whose body starts with a blank quoted line maps its card, title and body to their own lines`, `a quoted standalone card with a backtick fence and a blank first body line maps its card, title and body to their own lines`).
- Method: the same test file renders grids, a standalone card and a tab set written in a list item (bullet `-` and `*`, ordered `1.` and `10.`, nested item, list item inside a quote, quote inside a list item, blank first body line, cards on the next line, `:gutter:`, opener on its own indented line) and checks the `data-line` of the card, its title and its body (`a bullet grid whose body starts with a blank line maps its card, title and body to their own lines`, `a two-digit ordered grid whose body starts with a blank line maps its card, title and body to their own lines`, `a standalone card in a list item with a blank first body line maps its card, title and body to their own lines`, `a tab panel of a tab set written in a list item maps to its directive line`).
- Method: the same test file renders the same documents with a tab after the list marker (`-<TAB>`, `*<TAB>`, `1.<TAB>`, nested, inside a quote, `- <TAB>`) and with cards indented by a tab, on a grid, a standalone card and a tab set, and checks the same `data-line` values (`a dash-tab grid with cards indented 4 spaces maps its card, title and body to their own lines`, `a dash-space grid with cards indented by a tab maps its card, title and body to their own lines`, `a tab panel of a tab set behind a tab list marker maps to its directive line`).
- Method: test/core/render/gridCardTitleSourceLine.test.ts checks that only the header, footer and title lines carry `data-single-line`, and test/security/html-policy.test.ts that the sanitizer keeps it.
- Criteria: every mapped node of a title or option carries exactly the line of its directive or option line, and a leading number stays in the text.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-003](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-003.md): A writer edits the raw Markdown of a block in a framed editor
- Supersedes:
  - [SwRS-MDOKFSTUDIO-BLOCK-258](SwRS-MDOKFSTUDIO-BLOCK-258.md): A click on a card title or option opens the editor on its own line, the title is inline text and Enter saves a one-line editor
<!-- okf:links:end -->
