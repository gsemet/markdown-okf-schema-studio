---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-099
uuid: d5fe7c18-0144-46f7-9e9a-3c9586b464a5
title: Tabs follow the keyboard and the click
description: When a tab of a tab set is clicked, or has the focus and receives
  an arrow, Home or End key, the extension SHALL select the target tab, show
  only its panel, move the focus to it for keys, and select the tabs with the
  same sync key in the other tab sets of the same sync group.
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
- src/page/modules/tabs.ts
tested_in_files:
- test/integration/mystBlocksWindow.ts
- test/page/modules/tabs.test.ts
- test/visual/cardsTabsScenarios.ts
---

## Tabs follow the keyboard and the click

### Normative behavior

When a tab of a tab set is clicked, or has the focus and receives an arrow, Home or End key, the extension SHALL select the target tab, show only its panel, move the focus to it for keys, and select the tabs with the same sync key in the other tab sets of the same sync group.

### Scenario: Nominal

- GIVEN a tab set with the tabs Python, Node and Shell and the focus on the Node tab
- WHEN ArrowRight, ArrowLeft, Home and End are pressed in turn
- THEN the selection and the focus go to Shell, Node, Python and Shell, only the panel of the selected tab is shown, the keys are consumed, and a click on a tab selects it without moving the focus by script

| Input | Outcome |
| --- | --- |
| ArrowRight on the last tab, ArrowLeft on the first | the selection wraps around |
| ArrowUp, ArrowDown, a letter, or any key with Shift, Alt, Ctrl or Meta, or during composition | nothing changes and the key is not consumed |
| a tab with a sync key | the tabs with the same key in the other sets of the same sync group are selected too, without taking the focus; another group is untouched |
| a tab set inside a panel | selects within its own set only |
| a content patch that renders the sets again | the page puts back the choices it remembers, by position of the set, unless the set lost tabs |

### Scenario: Boundary or refusal

- GIVEN a key pressed in a panel or in text outside a tab
- WHEN the key is ArrowLeft or ArrowRight
- THEN no tab changes and the key is not consumed

### Related requirements

- SwRS-MDOKFSTUDIO-MYST-098: the markup of the tab set the page works on.

### Verification notes

- Method: test/page/modules/tabs.test.ts (keys, wrap, modifiers, click, nesting, sync groups, re-apply after a patch) the screenshot scenario myst/v43-tabs-keyboard-light-900 (a real click, Home, ArrowRight and End in the page bundle) and the real-window scenario test/integration/mystBlocksWindow.ts (a real click, ArrowRight, ArrowLeft, Home and End in the window)
- Criteria: the attributes and the shown panel after each key match the table above, and the focused element is the selected tab.
