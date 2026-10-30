---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-087
uuid: 92c5788a-f831-4ee8-930b-420c74423fd8
title: Edit mode places an insert point with a plus button after every body
  block
description: While edit mode is on, the page SHALL place an insert point holding
  a plus button labelled "Insert a block here" after every top-level body block
  and after the properties table, and a click on the plus opens an empty
  insertion editor at that place.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-011
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/editModeStyles.ts
- src/page/features/blockSourceEditor.ts
- src/page/features/insertPoints.ts
tested_in_files:
- test/core/preview/blockReq.requirements.test.ts
- test/integration/realInput/markers.ts
- test/page/runtimeBlockMoves.test.ts
- test/visual/scenarioDefinitions1.ts
default_owner_email: gaetan@xeberon.net
---

## Edit mode places an insert point with a plus button after every body block

### Normative behavior

While edit mode is on, the page SHALL place an insert point holding a plus button labelled "Insert a block here" after every top-level body block and after the properties table, and a click on the plus opens an empty insertion editor at that place.

### Scenario (nominal): Three blocks
- GIVEN a document with three body blocks and edit mode turned on
- WHEN the page builds the bars
- THEN three bars exist, one after each block, each with the source line the block ends at

### Scenario (boundary): Reading mode and rebuilds
| Input | Outcome |
| --- | --- |
| The same document in reading mode | No insert point exists |
| Edit mode toggled off and on | The old bars are gone and new ones exist, one per current block |
| A patch in edit mode whose block and neighbouring blocks are unchanged | The bar of that block is the same element and only its line number moves (SwRS-MDOKFSTUDIO-LIFE-069) |
| A page that starts or is patched in edit mode | The bars are built for the new content |

### Scenario (boundary): The properties table
| Input | Outcome |
| --- | --- |
| A document with frontmatter and edit mode on | A bar after the properties table has data-sphinx-insert-after-line 0 and no move buttons, only the plus button |
| A document without frontmatter | No bar for line 0 exists |

### Scenario (nominal): The plus button appears on hover and on keyboard focus
| Input | Outcome |
| --- | --- |
| Edit mode on and the pointer over a block or over the plus button | The plus button is visible (opacity 1) |
| The plus button has the keyboard focus (focus-visible) | The plus button is visible |
| No pointer and no focus on the bar | The plus button is transparent (opacity 0) but still reachable by keyboard |

### Scenario (nominal): Clicking the plus opens an empty insertion editor
- GIVEN a bar after a block that ends at line 9
- WHEN the writer clicks the plus
- THEN previewEditOpen carries insertAfterLine 9 and line and endLine 9, the bar is replaced by the frame and the empty text box has the focus with the status New block

### Scenario (refusal): Other input on the bar
- GIVEN an insert point
- WHEN a click or key reaches the document handlers of the page
- THEN no block editor of a rendered block opens

### Scenario (boundary): The insertion editor text box shows a placeholder
| Input | Outcome |
| --- | --- |
| An insertion editor receiving its empty source from the host | The text box is empty and shows the placeholder `Type Markdown, for example "## Heading" or "- item"` |
| A block editor on existing text | The text box has no placeholder |

### Scenario (boundary): The insert point follows the whole rendered block
| Input | Outcome |
| --- | --- |
| A document that ends with a figure, edit mode on | The bar follows the figure and its insertAfterLine is the line of the closing fence (9 in the scenario fixture) |
| A document that ends with a plain image, edit mode on | The bar follows the image and its insertAfterLine is the image line (5 in the scenario fixture) |
| A fenced code block whose mapped element is inside a pre element | The bar is the next sibling of the pre element |

### Related requirements
- SwRS-MDOKFSTUDIO-BLOCK-094: the host side of the insertion

### Verification notes
- Method: test/page/runtimeBlockMoves.test.ts (three blocks, reading mode, rebuild at init, properties table bar, click on the plus, other input on the bar, placeholder of the insertion editor); real-input scenario scenarioInsertBlocksFromPreview (screenshot block-editing/r16); visual scenario block-editing/v08 for the hover
- Method: test/core/preview/blockReq.requirements.test.ts (plus button transparent, opaque on hover of a block, of the button and on focus)
- Method: test/integration/realInput/markers.ts and test/visual/scenarioDefinitions1.ts (visual scenarios block-editing/v09, the message carries line 9, and block-editing/v10, line 5; real-input scenario scenarioInsertAfterFinalFigure, screenshots r17 and r18 in test/integration/realInput/renderPatching.ts); the pre case has no assertion of its own
- Criteria: one bar per body block in edit mode and none outside it; refreshInsertPoints leaves exactly one bar per body block, keeping the bar of a block with unchanged neighbours and removing the others (the keep is asserted by the unit test `P-07: edit mode keeps the insertion point of a block that did not change and moves its line`); the properties bar carries line 0 and only the plus button; the open message names the line the bar sits after; the placeholder attribute exists only for an editor with insertAfterLine; the bar is placed with insertAdjacentElement after the pre when there is one, else after the block

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-011](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-011.md): A writer adds blocks and starts an empty document from the preview
<!-- okf:links:end -->
