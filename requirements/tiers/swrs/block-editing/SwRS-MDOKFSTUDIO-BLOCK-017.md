---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-017
uuid: aabfd76c-2a9d-4ae1-83cf-131c3a68620a
title: "The hover outline shows what a click would edit"
description: "While edit mode is on, the page SHALL outline with a dashed line the
  element that a click at the pointer or focus would edit: the whole list for a list
  item, the cell for a table cell, the code block for a fence and else the mapped
  block, and the preview shows the text cursor over every element that carries a source
  file and line."
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-003
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/editModeStyles.ts
- src/page/features/editMode.ts
tested_in_files:
- test/core/preview/blockReq.requirements.test.ts
- test/integration/realInput.markers.ts
- test/page/blockReq.requirements.test.ts
- test/page/runtimeBlockEditor.test.ts
---

## The hover outline shows what a click would edit

### Normative behavior

While edit mode is on, the page SHALL outline with a dashed line the element that a click at the pointer or focus would edit: the whole list for a list item, the cell for a table cell, the code block for a fence and else the mapped block, and the preview shows the text cursor over every element that carries a source file and line.

### Scenario (nominal): Hovering a list item

- GIVEN edit mode on and a list with an item under the pointer
- WHEN the pointer moves over the item
- THEN exactly one element, the list, carries data-sphinx-preview-edit-hover

### Scenario (nominal): The outlined element per target

| Pointer or focus on | Outlined element |
| --- | --- |
| a list item | the whole list |
| a table cell | the cell |
| a fence | the code block |
| any other mapped block | the mapped block |

### Scenario (boundary): Pointer or focus leaves

- GIVEN the list is outlined
- WHEN the pointer leaves it or the focus leaves the item
- THEN no element carries the attribute

### Scenario (refusal): Targets that are not outlined

| Pointer over, edit mode on | Outcome |
| --- | --- |
| a cell of the properties table | no element receives the outline; the field editors are specified with the frontmatter editing behaviour |
| an element inside an open block editor, for example its frame | no element receives the outline |
| a mapped block that is itself inside a link | no element receives the outline |

### Scenario (nominal): The text cursor over mapped blocks

| Mode | Pointer over a mapped paragraph | Cursor |
| --- | --- | --- |
| edit mode on | yes | text |
| edit mode off | yes | the default one of the theme, not text |

### Known issues

- Known issue: the rule tests whether the mapped block itself is inside a link. A link inside a paragraph does not qualify, so the paragraph is outlined while the pointer is over the link.

### Verification notes

- Method: test/page/runtimeBlockEditor.test.ts (`edit mode hover marks the whole list that a click would edit`: hovering a list item and pointer or focus leaves).
- Method: test/integration/realInput.test.ts (scenarioEditAffordances, screenshot block-editing/r12: hovering a list item and the outlined element per target); visual scenarios block-editing/v06, v07 and v08 share the same assertions.
- Method: test/page/blockReq.requirements.test.ts (`the hover outline skips the properties table and an open editor, and an element in a link`: targets that are not outlined).
- Method: test/core/preview/blockReq.requirements.test.ts (`mapped blocks show the text cursor in edit mode only`: text cursor table).
- Criteria: At most one element carries the attribute; the outline is a 1 px dashed line in the focus colour; editHoverTarget returns nothing for the targets that are not outlined; the stylesheet holds the text cursor rule and only for edit mode.
