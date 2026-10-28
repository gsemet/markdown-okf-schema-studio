---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-098
uuid: 76d35011-2066-4e10-90c4-ac81d4c50fbe
title: Tab sets render a tab bar with one panel shown at a time
description: 'When a document holds a {tab-set} with {tab-item} children, the extension
  SHALL render a tab bar with ARIA tab roles and the tab-item titles, show only the
  panel of the selected tab (the :selected: item, else the first), keep every tab
  item a block that edit mode edits on its own source lines, and keep :sync: keys
  on the tabs.'
project: MDOKFSTUDIO
scope: myst
lifecycle: proposed
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
- src/core/render/mystNode.ts
- src/core/render/mystNormalize.ts
- src/page/features/editMode.ts
- src/page/features/pageInput.ts
tested_in_files:
- test/core/render/cardsTabs.test.ts
- test/integration/mystBlocksWindow.ts
- test/visual/cardsTabsScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## Tab sets render a tab bar with one panel shown at a time

### Normative behavior

When a document holds a {tab-set} with {tab-item} children, the extension SHALL render a tab bar with ARIA tab roles and the tab-item titles, show only the panel of the selected tab (the :selected: item, else the first), keep every tab item a block that edit mode edits on its own source lines, and keep :sync: keys on the tabs.

### Scenario: Nominal

- GIVEN a `{tab-set}` of the `{tab-item}`s Python, Node (with `:selected:`) and Shell, each with a body
- WHEN the preview renders
- THEN a `tablist` holds one `tab` button per item, each wired by `aria-controls` and `aria-labelledby` to its `tabpanel`, the Node tab has `aria-selected="true"` and `tabindex="0"` (the others `false` and `-1`), and only the Node panel is shown (the others carry `hidden`)

| Input | Outcome |
| --- | --- |
| no `:selected:` item | the first tab is selected |
| `:sync: key` on an item | the tab carries `data-myst-tab-sync` |
| `:sync-group: name` on the set | the set carries `data-myst-tab-group`, `tab` when absent |
| a title with Markdown or a link | the tab label is its plain text |
| a grid, a card, code or another tab set in an item | rendered in the panel; a nested set keeps its own tabs |

### Scenario: Edit mode

- GIVEN edit mode is on
- WHEN a tab is clicked and then its panel
- THEN the click on the tab bar only selects the tab and opens no editor, and the click on the shown panel opens the raw source of that `{tab-item}` only (its own lines), whose tab-set and panels each carry their `data-line` range

### Related requirements

- SwRS-MDOKFSTUDIO-MYST-099: how a tab is selected by click and keyboard.

### Verification notes

- Method: test/core/render/cardsTabs.test.ts (roles, ids, selection, hidden panels, sync attributes, source lines, nesting, sanitized output without script or handler, style rules) the screenshot scenarios myst/v41-cards-tabs-version-cream-900 and myst/v42-cards-tabs-version-dark-900 (the painted bar and one shown panel in both themes) and the real-window scenario test/integration/mystBlocksWindow.ts (the painted bar and panel, the click on a panel in edit mode)
- Criteria: the sanitized tree matches the table above and the painted page shows one panel at a time; the sanitizer is unchanged, the roles and ids pass its allow-list.
