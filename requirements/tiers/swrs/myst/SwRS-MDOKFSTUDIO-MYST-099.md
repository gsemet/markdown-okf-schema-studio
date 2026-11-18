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
- src/page/modules/tabs.ts
tested_in_files:
- test/integration/mystBlocksWindow.ts
- test/page/modules/tabs.test.ts
- test/visual/cardsTabsScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## Tabs follow the keyboard and the click

### Normative behavior

When a tab of a tab set is clicked, or has the focus and receives an arrow, Home or End key, the extension SHALL select the target tab, show only its panel, move the focus to it for keys, and select the tabs with the same sync key in the other tab sets of the same sync group.

### Scenario (nominal): The arrow, Home and End keys select a tab and move the focus

- GIVEN a tab set with the tabs Python, Node and Shell and the focus on the Node tab
- WHEN ArrowRight, ArrowLeft, Home and End are pressed in turn
- THEN the selection and the focus go to Shell, Node, Python and Shell, only the panel of the selected tab is shown, and the keys are consumed

### Scenario (nominal): A click selects a tab

- GIVEN a tab set with the tabs Python, Node and Shell
- WHEN the reader clicks the Shell tab
- THEN the Shell tab is selected and only its panel is shown, without moving the focus by script

### Scenario (boundary): The selection wraps around

- GIVEN a tab set whose last tab has the focus
- WHEN ArrowRight is pressed, then ArrowLeft on the first tab
- THEN the selection wraps around to the first tab, then to the last

### Scenario (refusal): Other keys change nothing

| Input | Outcome |
| --- | --- |
| ArrowUp, ArrowDown, a letter, or any key with Shift, Alt, Ctrl or Meta, or during composition | nothing changes and the key is not consumed |
| ArrowLeft or ArrowRight pressed in a panel or in text outside a tab | no tab changes and the key is not consumed |

### Scenario (nominal): Tabs with the same sync key follow each other

- GIVEN two tab sets of the same sync group whose tabs carry the sync keys `py` and `js`, and a third set of another group
- WHEN the reader selects the `js` tab of the first set
- THEN the `js` tab of the second set is selected too, without taking the focus, and the set of the other group is untouched

### Scenario (boundary): A nested tab set selects within its own set

- GIVEN a tab set inside a panel of another tab set
- WHEN a tab of the inner set is selected
- THEN only the inner set changes

### Scenario (boundary): A re-render keeps the chosen tabs

- GIVEN a reader who selected tabs in several sets
- WHEN a content patch renders the sets again
- THEN the page puts back the choices it remembers, by position of the set, unless the set lost tabs

### Related requirements

- SwRS-MDOKFSTUDIO-MYST-098: the markup of the tab set the page works on.

### Verification notes

- Method: test/page/modules/tabs.test.ts (keys, wrap, modifiers, click, nesting, sync groups, re-apply after a patch) the screenshot scenario myst/v43-tabs-keyboard-light-900 (a real click, Home, ArrowRight and End in the page bundle) and the real-window scenario test/integration/mystBlocksWindow.ts (a real click, ArrowRight, ArrowLeft, Home and End in the window)
- Criteria: the attributes and the shown panel after each key match the scenarios above, and the focused element is the selected tab.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-016](../../strs/myst/StRS-MDOKFSTUDIO-MYST-016.md): Grids, cards and tabs lay out a document in the preview
<!-- okf:links:end -->
