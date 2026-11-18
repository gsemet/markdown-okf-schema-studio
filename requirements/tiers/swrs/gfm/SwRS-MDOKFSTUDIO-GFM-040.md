---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-040
uuid: 071ac112-8c8e-48f4-a499-fcb7ed400fc7
title: A radio choice list renders as a radio group
description: When a list holds at least two consecutive items that start with '(
  )', '(x)' or '(X)', the extension SHALL render them as one labelled radio
  group with one tab stop, whose controls replace the markers and the bullets.
project: markdown-okf-schema-studio
scope: gfm
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-005
annotation_exemption: false
exemption_reason:
derived_by: []
supersedes:
- SwRS-MDOKFSTUDIO-GFM-039
implemented_in_files:
- src/core/render/checkboxMarkers.ts
- src/core/render/radioGroups.ts
- src/core/security/html-sanitizer.ts
tested_in_files:
- test/core/render/radioGroups.test.ts
- test/page/runtimeRadioGroups.test.ts
- test/security/html-policy.test.ts
- test/visual/radioPlanScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## A radio choice list renders as a radio group

### Normative behavior

When a list holds at least two consecutive items that start with '( )', '(x)' or '(X)', the extension SHALL render them as one labelled radio group with one tab stop, whose controls replace the markers and the bullets.

### Scenario (nominal): A radio group renders labelled, with one tab stop

- GIVEN the paragraph 'Fix direction:' followed by the list '- (x) A', '- ( ) B', '- ( ) C'
- WHEN the document renders, in any palette mode (Strict, GFM, MyST or Full: the mode changes only the palette buttons)
- THEN the list carries role="radiogroup" and aria-labelledby naming the paragraph, each item shows a round control with role="radio", aria-checked "true" for A and "false" for B and C, its source line and UTF-16 column, and the selected option (else the first) is the only one with tabindex 0; the list, its items and the option paragraphs carry tabindex -1 (focusable by a click or a script, out of the Tab order; the list stays a mapped block), so one Tab from the label paragraph lands on the selected option; the controls replace the markers and the bullets

### Scenario (boundary): Which items form a group

| Input | Outcome |
| --- | --- |
| a single '( )' or '(x)' item in its run | stays plain text '( ) ...' |
| '(X)' | a selected option; it is left as written unless a click selects another option |
| '(x)' with no space or tab after it, '(y)', '(x)' in a paragraph or not at the start of the item | plain text |
| a blank line between two radio items | ends the group; each run of at least two items is a group of its own |
| a heading, a list with another bullet or ordered marker, or a non-radio item between two radio items | ends the group |
| a list that mixes '[ ]' and '( )' items | the '[ ]' items stay checkboxes; a run of at least two '( )' items is a radio group owned by an empty role="radiogroup" element (aria-owns), and only a group that starts the list is labelled by the paragraph above it; the option items and paragraphs carry tabindex -1, the list keeps its own tab stop |
| an ordered list of radio items ('1. ( )', '2. (x)') | one group; each item keeps its number and shows the control after it |
| no '(x)' in the group | every option renders unselected, the first is the tab stop |
| two '(x)' in the group | both render selected, as written |
| a nested list of radio items | forms its own group, labelled by its parent item's text |
| markers in code, in a block quote or after frontmatter, CRLF files | literal in code; elsewhere the line and column are those of the document |

### Scenario (boundary): The sanitized webview HTML keeps the group

- GIVEN a rendered radio group
- WHEN the HTML is sanitized for the webview
- THEN it keeps the roles, the states, the ids, the source attributes and the tabindex -1 of the list, items and option paragraphs (a mapped block that already has a tabindex keeps it)

### Related requirements

- SwRS-MDOKFSTUDIO-GFM-016: renders task-list checkboxes, the sibling of this rendering
- SwRS-MDOKFSTUDIO-GFM-041: choosing an option of the group

### Verification notes

- Method: test/core/render/radioGroups.test.ts (rendering, grouping rules, labels, roving tab stop, sanitizer, the list, items and option paragraphs out of the Tab order, also in a mixed list and a nested group); test/security/html-policy.test.ts (a mapped block keeps its tabindex).
- Method: test/page/runtimeRadioGroups.test.ts (palette modes render the same group).
- Method: the screenshot scenarios gfm/v10-radio-plan-cream-900 and gfm/v11-radio-plan-dark-900 (test/visual/radioPlanScenarios.ts: a plan with a bulleted and an ordered group and a task list; the named groups, the selected options with their drawn dot, one tab stop per group, round controls in place of the bullets while the ordered group keeps its numbers, in both themes).
- Criteria: every run of at least two radio items is one group with one tab stop; the controls carry the source line and column of their marker; a single item stays text.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-GFM-005](../../strs/gfm/StRS-MDOKFSTUDIO-GFM-005.md): A writer or reviewer decides between the options of a plan with one click
- Supersedes:
  - [SwRS-MDOKFSTUDIO-GFM-039](SwRS-MDOKFSTUDIO-GFM-039.md): Radio choice lists render as a radio group and a click moves the selection in the source
<!-- okf:links:end -->
