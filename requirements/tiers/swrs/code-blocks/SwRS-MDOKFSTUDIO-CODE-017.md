---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-017
uuid: 840b982c-ce45-4694-8991-d5240d6004c3
title: A Copy code button appears on a hovered or focused code block
description: When the pointer is over a code block of the preview content, or
  the block holds keyboard focus, the extension SHALL show a 26 px Copy code
  button 6 px inside the block's top-right corner, below the sticky heading band
  and the floating toolbar when they cover that corner, and hide it whenever the
  pointer, a click, scrolling, a resize or a content patch makes it unusable.
project: markdown-okf-schema-studio
scope: code-blocks
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-004
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-006
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/contentPatch.ts
- src/page/modules/codeCopy.ts
tested_in_files:
- test/page/modules/codeCopy.test.ts
- test/page/modules/renderReq.codeCopy.requirements.test.ts
- test/visual/scenarioDefinitions1.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-CODE-018
- SwRS-MDOKFSTUDIO-CODE-022
- SwRS-MDOKFSTUDIO-CODE-023
- SwRS-MDOKFSTUDIO-CODE-024
- SwRS-MDOKFSTUDIO-CODE-029
- SwRS-MDOKFSTUDIO-CODE-032
- SwRS-MDOKFSTUDIO-CODE-033
- SwRS-MDOKFSTUDIO-CODE-034
- SwRS-MDOKFSTUDIO-CODE-035
---

## A Copy code button appears on a hovered or focused code block

### Normative behavior

When the pointer is over a code block of the preview content, or the block holds keyboard focus, the extension SHALL show a 26 px Copy code button 6 px inside the block's top-right corner, below the sticky heading band and the floating toolbar when they cover that corner, and hide it whenever the pointer, a click, scrolling, a resize or a content patch makes it unusable.

### Scenario (nominal): The button appears on hover

- GIVEN a code block under the pointer
- WHEN the pointer enters the block
- THEN a 26 px Copy code button appears 6 px inside its top-right corner

### Scenario (boundary): No button before the first hover

- GIVEN no code block has been hovered yet
- WHEN the page is loaded
- THEN no copy button exists in the page

### Scenario (refusal): Some blocks never get a button

| Block | Outcome |
| --- | --- |
| a block that is open for editing | no copy button appears |
| a code block inside a block editor | no copy button appears |
| the source of a Mermaid or PlantUML diagram | no copy button appears |
| a code block in the toolbar or a panel outside the preview content | no copy button appears |

### Scenario (nominal): The button stays clear of the sticky band and toolbar

- GIVEN a block whose top edge is under the sticky heading band, or whose default button position would overlap the floating toolbar
- WHEN the pointer enters the block
- THEN the button is placed below the band or below the toolbar

### Scenario (boundary): The button follows the visible part of the block

| Situation | Outcome |
| --- | --- |
| the button is shown and the block scrolls under the sticky band to 29 px visible | the button is hidden |
| the block scrolls back to exactly 30 px visible with the pointer over it | the button is shown again |
| the window is resized and the button is shown | the button moves to 6 px inside the resized block's top-right corner |
| the resize leaves less than 30 px of the block visible | the button is hidden |
| several scroll events arrive before the next animation frame | the button is placed once, in that frame, for the block's position then |

### Scenario (boundary): Events that hide the button

| Event | Outcome |
| --- | --- |
| the reader clicks inside the hovered block | the button is hidden until the pointer moves again; a pointer move within the block shows it again |
| the pointer leaves the block | the button is hidden |
| the pointer moves from the block onto the button | the mouseout fires and the button stays shown |
| scrolling stops for 120 ms with the pointer outside the hovered block | the button is hidden |
| scrolling stops for 120 ms with the pointer still over the block | the button stays shown |
| a content patch updates the preview in place while the button is shown | the button is hidden |
| a content patch is applied while no button is shown | nothing changes and no error occurs |

### Scenario (boundary): The Copied state is reset by another block

| Situation | Outcome |
| --- | --- |
| the button shows Copied on block A and the pointer enters block B | the button on block B reads Copy code with no check mark |
| the button shows Copied and the pointer stays in the same block | the Copied state is kept until the 1.5 s end |

### Scenario (nominal): The keyboard reaches the button

| Step | Outcome |
| --- | --- |
| Tab moves focus to a code block | the block shows a focus ring and the Copy code button appears at the same place as on hover |
| Tab is pressed again | focus moves to the button, which shows a focus ring |
| Enter or Space is pressed on the button | the raw code is copied and the button shows Copied |
| Shift+Tab is pressed on the button | focus returns to the block and the button stays shown |
| focus leaves the block and the button | the button is hidden |

### Scenario (refusal): Blocks that are not tab stops

- GIVEN a block being edited, a code block inside a block editor, or the source of a Mermaid or PlantUML diagram
- WHEN the reader tabs through the page
- THEN the block is not a tab stop and no copy button appears for it

### Related requirements

- SwRS-MDOKFSTUDIO-CODE-019: copies the raw code of the block and confirms it
- SwRS-MDOKFSTUDIO-TRUST-006: a read-only preview keeps copying (see SwRS-MDOKFSTUDIO-TRUST-006)

### Verification notes

- Method: test/page/modules/codeCopy.test.ts (the button follows the visible part of the block, scroll events within one frame): unit test `P-08: scroll events within one frame place the button once, for the position of that frame`.
- Method: test/page/modules/codeCopy.test.ts (hover button geometry, created only on first hover, excluded block kinds, 30 px threshold, click hiding, pointer leaving and moving onto the button, 120 ms scroll settle, placement below the band and toolbar)
- Method: test/page/modules/renderReq.codeCopy.requirements.test.ts (resize moves the button to the new top-right corner and hides it when too little shows, Copied reset on another block, hide on content patch)
- Method: test/page/modules/codeCopy.test.ts (keyboard: tab stop on copyable blocks only, focus reveals the button, Tab and Shift+Tab between block and button, Enter on the button copies)
- Method: test/visual/scenarioDefinitions1.ts (copy-button visual scenarios: geometry and placement; keyboard focus scenarios in light and dark with the focus rings)
- Criteria: button geometry matches the statement; the button is created only on first hover; no button for the excluded block kinds or for blocks outside the content element; visibility toggles at the 30 px threshold; hide is called once per applied patch; button position follows the block rect after resize; state reset only when the hovered block changes; button top is not above the bottom of the band or toolbar

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CODE-004](../../strs/code-blocks/StRS-MDOKFSTUDIO-CODE-004.md): A reader copies the exact code of a block
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-006](../trust-security/SwRS-MDOKFSTUDIO-TRUST-006.md): A read-only preview keeps every viewing action
- Supersedes:
  - [SwRS-MDOKFSTUDIO-CODE-018](SwRS-MDOKFSTUDIO-CODE-018.md): Hide the copy button below 30 px of visible block
  - [SwRS-MDOKFSTUDIO-CODE-022](SwRS-MDOKFSTUDIO-CODE-022.md): Offer no copy button for edited blocks, editors, diagram sources and blocks outside the content
  - [SwRS-MDOKFSTUDIO-CODE-023](SwRS-MDOKFSTUDIO-CODE-023.md): Hide the copy button on a click inside the block until the pointer moves
  - [SwRS-MDOKFSTUDIO-CODE-024](SwRS-MDOKFSTUDIO-CODE-024.md): Hide the copy button when a content patch updates the page
  - [SwRS-MDOKFSTUDIO-CODE-029](SwRS-MDOKFSTUDIO-CODE-029.md): Hide the copy button when the pointer leaves the block
  - [SwRS-MDOKFSTUDIO-CODE-032](SwRS-MDOKFSTUDIO-CODE-032.md): Hide the copy button when scrolling stops outside the block
  - [SwRS-MDOKFSTUDIO-CODE-033](SwRS-MDOKFSTUDIO-CODE-033.md): Reposition the copy button on window resize
  - [SwRS-MDOKFSTUDIO-CODE-034](SwRS-MDOKFSTUDIO-CODE-034.md): Keep the copy button clear of the sticky band and toolbar
  - [SwRS-MDOKFSTUDIO-CODE-035](SwRS-MDOKFSTUDIO-CODE-035.md): Reset the Copied state when another block is hovered
<!-- okf:links:end -->
