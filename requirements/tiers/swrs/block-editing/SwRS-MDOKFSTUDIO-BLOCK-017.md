---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-017
uuid: aabfd76c-2a9d-4ae1-83cf-131c3a68620a
title: "The hover outline shows what a click would edit"
description: "While edit mode is on, the page SHALL outline with a dashed line the
  element that a click at the pointer or focus would edit: the whole list for a list
  item, the cell for a table cell, the code block for a fence and else the mapped
  block, and the preview shows the text cursor over every element that carries a source
  file and line and over the links whose plain click opens the block editor, while
  every other link keeps the pointer cursor and gets no outline."
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
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
- src/page/features/linkEditing.ts
tested_in_files:
- test/core/preview/blockReq.requirements.test.ts
- test/integration/realInput/markers.ts
- test/page/blockReq.requirements.test.ts
- test/page/linkEditModeClick.test.ts
- test/page/runtimeBlockEditor.test.ts
default_owner_email: gaetan@xeberon.net
---

## The hover outline shows what a click would edit

### Normative behavior

While edit mode is on, the page SHALL outline with a dashed line the element that a click at the pointer or focus would edit: the whole list for a list item, the cell for a table cell, the code block for a fence and else the mapped block, and the preview shows the text cursor over every element that carries a source file and line and over the links whose plain click opens the block editor, while every other link keeps the pointer cursor and gets no outline.

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

### Scenario (nominal): Links are outlined like the text around them

| Pointer over, edit mode on | Outcome |
| --- | --- |
| a link inside a paragraph, or a paragraph made only of a link | the paragraph is outlined, as a click there opens its editor (SwRS-MDOKFSTUDIO-BLOCK-014) |
| a mapped block that is itself inside a link | that block is outlined |
| the title, header, body or footer of a `:link:` card | only the part under the pointer is outlined, as on a card without link, never the whole card |

### Scenario (refusal): Links whose click keeps its own behaviour

Only the links whose plain click opens the block editor (SwRS-MDOKFSTUDIO-BLOCK-014) get the outline and the text cursor.

| Pointer over, edit mode on | Outline | Cursor |
| --- | --- | --- |
| a link in the body of a comment thread | none | pointer |
| a link value of the properties table | none | pointer |
| a link inside an open block editor, in the toolbar or outside any mapped block | none | pointer |

### Scenario (nominal): The text cursor over mapped blocks

| Mode | Pointer over a mapped paragraph | Cursor |
| --- | --- | --- |
| edit mode on | yes | text |
| edit mode off | yes | the default one of the theme, not text |
| edit mode on | a link inside a mapped block whose plain click opens the block editor | text, like the rest of the block |
| edit mode on | any other link | pointer |

### Verification notes

- Method: test/page/runtimeBlockEditor.test.ts (`edit mode hover marks the whole list that a click would edit`: hovering a list item and pointer or focus leaves).
- Method: test/integration/realInput/editorWidgets.ts (scenarioEditAffordances, screenshot block-editing/r12: hovering a list item and the outlined element per target); visual scenarios block-editing/v06, v07 and v08 share the same assertions.
- Method: test/page/blockReq.requirements.test.ts (`hovering a link inside a paragraph outlines the paragraph, like the text around it`: link inside a paragraph row).
- Method: test/page/blockReq.requirements.test.ts (`the hover outline skips the properties table and an open editor, and outlines a block inside a link`: targets that are not outlined and the block inside a link row).
- Method: visual scenarios block-editing/v29, v30, v33 and v34 in test/visual/linkEditModeScenarios.ts (the pointer over the link of a link-only paragraph outlines the paragraph; over the body of a linked card, the body paragraph only). The text cursor over a link is not asserted.
- Method: test/core/preview/blockReq.requirements.test.ts (`mapped blocks show the text cursor in edit mode only`: text cursor table).
- Method: test/page/linkEditModeClick.test.ts (`edit mode: hovering a link in a comment-thread body shows no edit outline and keeps the pointer cursor`, `edit mode: hovering a link of the properties table shows no edit outline and keeps the pointer cursor`, `edit mode: hovering a link inside a paragraph outlines the paragraph and gives it the text cursor`, `edit mode stylesheet: only links a plain click edits get the text cursor; every other link keeps its pointer`: links whose click keeps its own behaviour and the link rows of the text cursor table).
- Criteria: At most one element carries the attribute; the outline is a 1 px dashed line in the focus colour; editHoverTarget returns nothing for the targets that are not outlined and treats an element inside a link like any element of its mapped block, except inside a link whose click keeps its own behaviour (inLinkThatKeepsItsBehaviour in src/page/features/linkEditing.ts, the same rule as linkActivationEdits), where it returns nothing; the stylesheet holds the text cursor rule and only for edit mode, and gives it to a link only through the data-sphinx-preview-link-edits marker that syncLinkFollowHints sets on exactly the links linkActivationEdits would edit.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-003](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-003.md): A writer edits the raw Markdown of a block in a framed editor
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-001](../trust-security/SwRS-MDOKFSTUDIO-TRUST-001.md): A read-only preview offers no editing affordance
<!-- okf:links:end -->
