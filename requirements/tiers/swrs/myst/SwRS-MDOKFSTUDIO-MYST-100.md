---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-100
uuid: 28781b28-fac4-4b3f-a86f-dca3897f2e0d
title: Standalone cards show header, title, body and footer
description: 'When a document holds a {card} directive outside a grid, the extension
  SHALL render a card showing its :header: and ^^^ header above its title, its body,
  and its :footer: and +++ footer, make the title one link when :link: is given and
  add the safe names of :class-card: to the card.'
project: MDOKFSTUDIO
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/contentBlockStyles.ts
- src/core/render/mystGridToctree.ts
tested_in_files:
- test/core/render/cardsTabs.test.ts
- test/integration/mystBlocksWindow.ts
- test/visual/cardsTabsScenarios.ts
---

## Standalone cards show header, title, body and footer

### Normative behavior

When a document holds a {card} directive outside a grid, the extension SHALL render a card showing its :header: and ^^^ header above its title, its body, and its :footer: and +++ footer, make the title one link when :link: is given and add the safe names of :class-card: to the card.

### Scenario: Nominal

- GIVEN a `{card}` titled "Claude Code" with `:header: Since v2.1.154`, `:footer: Documented in the guide` and a body holding a list
- WHEN the preview renders
- THEN one card shows the header line, then the title, then the body with its list, then the footer line, with the grid card look, and a click on it in edit mode edits the lines of the directive

| Input | Outcome |
| --- | --- |
| a line `^^^` in the body | the blocks before it are the header, after the `:header:` line when both are given |
| a line `+++` in the body | the blocks after it are the footer, after the `:footer:` line when both are given |
| `:link:` (with `:link-type:` and `:link-alt:`) | the title is one link and the whole card is its click target, like a grid card |
| `:class-card:` with plain names | the names are added to the card's classes, on a `{card}` and on a `{grid-item-card}` |
| the option text of `:header:` and `:footer:` | inline Markdown, rendered in the part and never a mapped block |

### Scenario: Boundary or refusal

- GIVEN a `{card}` without header, footer or link, or with `:class-card:` names that start with `okf-`, `sphinx-`, `myst-`, `vscode-` or `studio-` or hold characters other than letters, digits, `_` and `-`
- WHEN the preview renders
- THEN the card shows the title and body only, the reserved or malformed names are dropped (at most 8 names are kept), and a card inside a grid item, a tab item or another card renders the same way

### Related requirements

- SwRS-MDOKFSTUDIO-MYST-053: the grid cards, which a standalone card shares its parts and look with.

### Verification notes

- Method: test/core/render/cardsTabs.test.ts (parts and their order, separators, link, class names, nesting, no mapped option line, style rules) the screenshot scenarios myst/v41-cards-tabs-version-cream-900 and myst/v42-cards-tabs-version-dark-900 (test/visual/cardsTabsScenarios.ts: parts, order, theme colours) and the real-window scenario test/integration/mystBlocksWindow.ts (the painted card in the cream and a dark theme)
- Criteria: the rendered tree has the parts in the order header, title, body, footer, and the painted card shows them.
