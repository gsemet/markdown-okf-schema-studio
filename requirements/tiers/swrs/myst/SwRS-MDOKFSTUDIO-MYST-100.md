---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-100
uuid: 28781b28-fac4-4b3f-a86f-dca3897f2e0d
title: A card, in a grid or alone, shows header, title, body and footer
description: 'When a document holds a {card} directive, or a {grid-item-card} in a
  grid, the extension SHALL render a card showing its :header: and ^^^ header above
  its title, its body, and its :footer: and +++ footer, make the title one link when
  :link: is given and add the safe names of :class-card: to the card.'
project: markdown-okf-schema-studio
scope: myst
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-016
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/contentBlockStyles.markers.ts
- src/core/render/mystGridToctree.ts
tested_in_files:
- test/core/render/cardsTabs.test.ts
- test/core/render/gridCardTitleSourceLine.test.ts
- test/core/render/gridToctree.test.ts
- test/integration/mystBlocksWindow.ts
- test/visual/cardsTabsScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## A card, in a grid or alone, shows header, title, body and footer

### Normative behavior

When a document holds a {card} directive, or a {grid-item-card} in a grid, the extension SHALL render a card showing its :header: and ^^^ header above its title, its body, and its :footer: and +++ footer, make the title one link when :link: is given and add the safe names of :class-card: to the card.

### Scenario (nominal): A standalone card shows its parts in order

- GIVEN a `{card}` titled "Claude Code" with `:header: Since v2.1.154`, `:footer: Documented in the guide` and a body holding a list
- WHEN the preview renders
- THEN one card shows the header line, then the title, then the body with its list, then the footer line, with the grid card look, and a click on it in edit mode edits the lines of the directive

### Scenario (nominal): A grid card shows its parts

- GIVEN a `{grid-item-card}` with title, a header before `^^^`, body and a footer after `+++`
- WHEN the preview renders
- THEN all four parts show

### Scenario (boundary): Card parts, link and classes

| Input | Outcome |
| --- | --- |
| a line `^^^` in the body | the blocks before it are the header, after the `:header:` line when both are given |
| a line `+++` in the body | the blocks after it are the footer, after the `:footer:` line when both are given |
| `:link:` (with `:link-type:` and `:link-alt:`) | the title is one link and the whole card is its click target; `:link-alt:` is its tooltip |
| `:link:` with `:link-type: ref` | a `#label` link |
| `:link:` with `:link-type: doc` | the link adds `.md` |
| a title that already holds a link | only one link is made |
| `:class-card:` with plain names | the names are added to the card's classes, on a `{card}` and on a `{grid-item-card}` |
| the option text of `:header:` and `:footer:` | inline Markdown, rendered in the part as inline text only (a leading "4." stays literal) and mapped to its own option line, so a click opens the editor on it (see SwRS-MDOKFSTUDIO-BLOCK-258) |
| a card inside a grid item, a tab item or another card | renders the same way |

### Scenario (refusal): Empty cards and unsafe class names

| Input | Outcome |
| --- | --- |
| a card without title, link or parts | an empty body shows |
| a `{card}` without header, footer or link | the card shows the title and body only |
| `:class-card:` names that start with `okf-`, `sphinx-`, `myst-`, `vscode-` or `studio-`, or hold characters other than letters, digits, `_` and `-` | the names are dropped |
| more than 8 `:class-card:` names | at most 8 names are kept |

### Related requirements

- SwRS-MDOKFSTUDIO-MYST-053: the grid columns that hold the grid cards.

### Verification notes

- Method: test/core/render/gridToctree.test.ts ("a grid-item-card renders header, body, footer and a stretched link": grid card parts and links).
- Method: test/core/render/cardsTabs.test.ts (parts and their order, separators, link, class names, nesting, no mapped option line, style rules); the screenshot scenarios myst/v41-cards-tabs-version-cream-900 and myst/v42-cards-tabs-version-dark-900 (test/visual/cardsTabsScenarios.ts: parts, order, theme colours) and the real-window scenario test/integration/mystBlocksWindow.ts (the painted card in the cream and a dark theme)
- Criteria: the rendered tree has the parts in the order header, title, body, footer, and the painted card shows them.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-016](../../strs/myst/StRS-MDOKFSTUDIO-MYST-016.md): Grids, cards and tabs lay out a document in the preview
<!-- okf:links:end -->
