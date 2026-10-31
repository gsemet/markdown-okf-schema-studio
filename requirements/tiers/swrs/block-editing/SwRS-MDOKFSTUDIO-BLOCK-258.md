---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-258
uuid: d1b97882-7059-47cf-9a34-3e9188f3eccb
title: A click on a card title opens the editor on the directive line and the
  title is inline text
description: When the writer clicks the title of a grid card or of a card, with
  or without a `:link:` option, in edit mode, the preview SHALL open the block
  editor on the directive line of that card (the `:::{grid-item-card}` or
  `:::{card}` line that holds the title), and when the writer clicks the text of
  its `:header:` or `:footer:` option, on that option's own line, rendering the
  title and the option text as inline text so that a leading "2." stays literal.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/editModeStyles.ts
- src/core/render/mystGridToctree.ts
tested_in_files:
- test/core/render/gridCardTitleSourceLine.test.ts
- test/integration/realInput/markers.ts
- test/page/linkEditModeClick.test.ts
- test/visual/gridCardEditingScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## A click on a card title opens the editor on the directive line and the title is inline text

### Normative behavior

When the writer clicks the title of a grid card or of a card, with or without a `:link:` option, in edit mode, the preview SHALL open the block editor on the directive line of that card (the `:::{grid-item-card}` or `:::{card}` line that holds the title), and when the writer clicks the text of its `:header:` or `:footer:` option, on that option's own line, rendering the title and the option text as inline text so that a leading "2." stays literal.

### Scenario (nominal): The numbered title of a grid card

- GIVEN edit mode on a document whose line 8 is `:::{grid-item-card} 2. Status projection`
- WHEN the writer clicks the title of that card
- THEN the title shows the text "2. Status projection" (the number is not turned into a list), the editor opens inside the card on line 8 and holds that directive line, and Done replaces line 8 only, never line 1 of the document; a plain title such as `Plain *title*` opens its directive line in the same way

### Scenario (nominal): The header and footer options of a card

- GIVEN a `{card}` whose options are `:class-card: x` on line 4, `:header: 4. H` on line 5 and `:footer: 5. F` on line 6
- WHEN the writer clicks the header text, then the footer text
- THEN the header "4. H" opens the editor on line 5 only and the footer "5. F" on line 6 only, each shown as literal inline text with its number

### Scenario (boundary): A card with a link

- GIVEN a `{card}` titled `3. Linked` with the option `:link: https://example.com`, or the grid card `:::{grid-item-card} Linked card` on line 14 with `:link: targets/alpha.md`, a header section, a body on line 19 and a footer on line 21
- WHEN the writer clicks the title, the header, the body or the footer in edit mode
- THEN the title is a link mapped to the directive line, like a plain title: a click on it opens the editor on line 3 (line 14 for the grid card) and does not follow the link; a click on the header, the body or the footer opens the editor on that part's own lines, because in edit mode the stretched link of the card no longer covers the card (SwRS-MDOKFSTUDIO-BLOCK-014)
- AND a Cmd or Ctrl click on the title follows the link and opens no editor; in reading mode a click anywhere on the card follows the link

### Verification notes

- Method: test/core/render/gridCardTitleSourceLine.test.ts renders the fixture and small documents, and checks the title text, the absence of list elements, the data-line of the title, of the header and of the footer option, and the linked title mapped to its directive line (`a card title with a link option maps to its directive line like a plain title`, `a linked grid card title maps to its directive line and keeps its link`); test/page/linkEditModeClick.test.ts checks that a click on the title, body and footer of a linked card opens lines 14, 19 and 21 and that a Cmd or Ctrl click on the title follows the link; the visual scenarios `block-editing/v25` and `v26` check that the open title editor holds the directive line, and `block-editing/v31` and `v32` (test/visual/linkEditModeScenarios.ts) that a real click on the footer of a linked card opens its editor inside the card. The reading mode row is not asserted by a dedicated test.
- Criteria: every mapped node of a title or option carries exactly the line of its directive or option line, and a leading number stays in the text.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-001](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-001.md): A writer switches edit mode and finds it as left
<!-- okf:links:end -->
