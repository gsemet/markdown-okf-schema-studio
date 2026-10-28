---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-127
uuid: 81487819-c0df-43a3-a8ba-733482274b4a
title: "An included block is never moved, cut, copied, selected or pasted after"
description: "When a move, a copy, a cut, a block selection or a paste would involve
  a block that comes from an {include}, the extension SHALL refuse it, the page by
  disabling the arrow, ending or emptying the selection or showing a notice and the
  host by answering with the reason of that case, and change nothing."
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-014
- StRS-MDOKFSTUDIO-BLOCK-003
- StRS-MDOKFSTUDIO-BLOCK-016
- StRS-MDOKFSTUDIO-BLOCK-025
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-BLOCK-058
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-065
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/edits/sourceEdits.ts
- src/core/mapping/blockMove.ts
- src/page/features/blockMoves.ts
- src/page/features/blockSelectionView.ts
- src/page/modules/blockSelection.ts
tested_in_files:
- test/core/edits/sourceEdits.test.ts
- test/core/mapping/blockMove.test.ts
- test/integration/blockClipboard.test.ts
- test/integration/blockMove.test.ts
- test/page/blockReq.requirements.test.ts
- test/page/modules/blockSelection.test.ts
- test/page/runtimeBlockMoves.test.ts
- test/page/runtimeBlockSelection.test.ts
default_owner_email: gaetan@xeberon.net
---

## An included block is never moved, cut, copied, selected or pasted after

### Normative behavior

When a move, a copy, a cut, a block selection or a paste would involve a block that comes from an {include}, the extension SHALL refuse it, the page by disabling the arrow, ending or emptying the selection or showing a notice and the host by answering with the reason of that case, and change nothing.

### Scenario (nominal): Blocks without an include

| Input | Outcome |
| --- | --- |
| A block that opens another directive, the move is planned | It is planned |
| A document without includes, the bars are built | No arrow is disabled except at the ends |
| A span without an include, a copy is handled | It is done |
| The focused insert point of a normal block, the writer presses Ctrl+V | previewBlocksPaste is posted |
| A paste after line 0 or after a line outside the text | The include check does not refuse |

### Scenario (refusal): The host refuses to move an included block

- GIVEN a block whose first line opens an {include} fence (colon, backtick or tilde fence)
- WHEN the move is planned
- THEN it is refused with "A block that comes from an included file cannot be moved." and nothing changes

### Scenario (refusal): The arrows beside an included block are disabled

- GIVEN a block that comes from an include, with a normal block above it
- WHEN the bars are built
- THEN both arrows of the included block's bar are disabled, and the down arrow of the block above is disabled as well

### Scenario (boundary): A selection never reaches an included block

| Input | Outcome |
| --- | --- |
| Blocks A, B, included C and D, A is the anchor, the writer Shift+clicks D | A and B are selected, not C or D |
| An included block directly after the anchor A, the writer Shift+clicks it | Only A is selected |
| An included block clicked first, the writer Shift+clicks another block | Nothing is selected |
| A focused included block, the writer presses Shift+ArrowDown | Nothing is selected |

### Scenario (refusal): Copy and cut of an included block

- GIVEN a span that contains an include directive line
- WHEN the copy or the cut is handled
- THEN the answer is ok false with "A block that comes from an included file cannot be copied or cut." and the clipboard is untouched

### Scenario (refusal): The page refuses a paste from the insert point of an included block

- GIVEN the focused insert point of an included block and no selection
- WHEN the writer presses Ctrl+V
- THEN the selection status shows "Text cannot be pasted next to a block that comes from an included file." for four seconds and no previewBlocksPaste is posted

### Scenario (refusal): The host refuses a paste after a line that opens an include directive

- GIVEN a document whose first block is a fenced {include} directive and a paste after line 1
- WHEN the host handles it
- THEN the answer is ok false with "Text cannot be pasted next to a block that comes from an included file." and the document and the clipboard are untouched

### Scenario (refusal): The host refuses a paste after the closing fence of an include directive

- GIVEN a document whose first block is a fenced {include} directive of two lines and a paste after line 2, the closing fence, which is where the insert point of the included block sits
- WHEN the host handles it
- THEN the answer is ok false with "Text cannot be pasted next to a block that comes from an included file." and the document and the clipboard are untouched; a paste after the blank line that follows the directive is accepted

### Related requirements

- SwRS-MDOKFSTUDIO-BLOCK-117: the move that the host refusal guards
- SwRS-MDOKFSTUDIO-BLOCK-140: the selection gestures that stop before an included block
- SwRS-MDOKFSTUDIO-BLOCK-124: the other refusals of the same requests
- SwRS-MDOKFSTUDIO-BLOCK-166: copy
- SwRS-MDOKFSTUDIO-BLOCK-169: cut
- SwRS-MDOKFSTUDIO-BLOCK-174: paste

### Verification notes

- Method: test/core/mapping/blockMove.test.ts (`detects the line that opens an include directive`: colon, backtick and tilde fences).
- Method: test/core/edits/sourceEdits.test.ts (`a block move is refused for an included block, after the planner's own checks`, `copy and cut refuse an included block and a range outside the text`, `a paste inserts the clipboard as new blocks, never next to an included block`).
- Method: test/integration/blockMove.test.ts (include) and test/integration/blockClipboard.test.ts (include).
- Method: test/page/runtimeBlockMoves.test.ts (`T36: a block from an included file disables its own buttons and the ones toward it`).
- Method: test/page/modules/blockSelection.test.ts (`T39: an included block stops the range before it`, `T39: an included block cannot be the anchor, nor start a selection`) and test/page/runtimeBlockSelection.test.ts (`T39: included blocks stop the range and the properties table is never selected`).
- Method: test/page/blockReq.requirements.test.ts (`the paste chord on the insert point of an included block shows a notice and posts nothing`).
- Criteria: opensIncludeDirective matches colon, backtick and tilde fences; isIncludedBlock of the block or of the neighbour disables the button; the selection model treats included blocks as blocking and extendTo clears the selection when the anchor is blocked; linesOpenInclude finds the directive; checkBlocksPaste returns the refusal only for a line that opens the directive; the page refusal needs no host round trip.
