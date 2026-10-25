---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-125
uuid: e2040907-b4c5-42c4-a6b1-18da714165dc
title: The reading state of recent documents is saved within bounds
description: When the page reports its reading state while the reader scrolls,
  the extension SHALL write the state and post previewState at most once per 100
  ms with the last state always reaching the host, record each valid report for
  the preview's document, and remember the reading state of at most the 200 most
  recent documents.
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-010
- StRS-MDOKFSTUDIO-LIFE-014
- StRS-MDOKFSTUDIO-LIFE-003
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-065
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/state/boundedState.ts
- src/page/pageHost.ts
- src/session/features/viewState.ts
- src/session/previewManager.ts
tested_in_files:
- test/core/state/boundedState.test.ts
- test/host/lifeReq.requirements.test.ts
- test/integration/lifecycle.test.ts
- test/page/pageTimers.test.ts
---

## The reading state of recent documents is saved within bounds

### Normative behavior

When the page reports its reading state while the reader scrolls, the extension SHALL write the state and post previewState at most once per 100 ms with the last state always reaching the host, record each valid report for the preview's document, and remember the reading state of at most the 200 most recent documents.

### Scenario (nominal): Scroll burst
- GIVEN forty scroll frames in 100 ms
- WHEN the state is written
- THEN the first write goes through at once, one more follows with the last state, and previewScroll messages are never delayed

### Scenario (boundary): Hidden page
- GIVEN a held-back state and the page becoming hidden
- WHEN the visibility changes
- THEN the held-back state is written and posted at once

### Scenario (nominal): The host records the state of a report
- GIVEN a previewState with line 4 and scroll 88 for the current render
- WHEN the host receives it
- THEN the preview's state holds sourceLine 4 and scrollTop 88; a previewScroll, a previewReveal and a previewRefresh also carry the state and record it the same way

### Scenario (refusal): Invalid state report
| Input | Outcome |
| --- | --- |
| a report whose state does not parse, or names another document | the recorded state is unchanged |
| a report with a line below 1 or not a safe integer, or a negative or non-finite scrollTop | the envelope check drops the message without a visible change (see SwRS-MDOKFSTUDIO-TRUST-052) |
| a sourceLine or scrollTop that fails the host's own parse | that field is left out of the recorded state |
| focusedBlockId longer than 200 characters, or selectedText longer than 4096 characters | that field is left out of the recorded state |
| openDisclosures | only safe integers from 0 to 9999 are kept, at most the first 100 |
| descriptionsCollapsed not a boolean | the previous Description state is kept |

### Scenario (nominal): Switching to a document starts it fresh
| Input | Outcome |
| --- | --- |
| a preview scrolled to line 80 of A, with a focused block and open sections, then switched to B (which reported no scroll anchor) and back to A | A renders again with its scroll line 80 through the stored anchor, and starts without the focused block, the selection, the open sections and the Description state it had |
| the same sequence, but B's page reported its own scroll anchor | the scroll line of A is not kept; with a following preview the render starts at the editor's first visible line |

### Scenario (boundary): The 200 most recent documents
| Input | Outcome |
| --- | --- |
| 200 remembered documents and a state stored for a 201st | the least recently used entry is gone |
| the oldest entry is read before the 201st is stored | the entry that was read is kept and the next oldest is evicted; a peek does not protect an entry |
| a state stored again for a remembered document | the entry becomes the most recent and the map does not grow |
| a capacity that is not valid | rejected; the default capacity is 200 |

### Known issues
- Known issue: switchDocument reads the remembered state of the document, then the pending page it shows clears it (showPending sets the state to undefined) before the render builds its context, so a document the reader returns to does not get its focused block, selection, open sections or Description state back; the scroll anchor survives only until another document reports its own. Deduced from the code, not run.
- Known issue: the remembered states of the 200 most recent documents are never used after a switch, see the Known issue above.

### Related requirements
- SwRS-MDOKFSTUDIO-LIFE-108: previewScroll and previewReveal, which also report the state
- SwRS-MDOKFSTUDIO-LIFE-119: the anchor that a new render starts at

### Verification notes
- Method: test/page/pageTimers.test.ts and test/page/pageHost.test.ts (scenarios 1 and 2: "the webview state is written at once, then at most once per 100 ms with the last state", "previewState messages are throttled to one per 100 ms; previewScroll is never held back", "a hidden page writes the held-back state and posts the held-back previewState at once")
- Method: test/integration/lifecycle.test.ts (scenario 3: sourceLine and scrollTop after previewState)
- Method: scenario 4 is checked by reading parsePreviewPanelState in src/core/state/previewState.ts and hasValidStateFields in src/core/protocol/pageToHost.ts (untested for the field bounds)
- Method: test/host/lifeReq.requirements.test.ts (scenario 5: "switching back to a document does not bring back its remembered state (Known issue)", by reading switchDocument and RenderingController.showPending in the A, B, A path; a single integration test, A to line 80, B, back to A, would settle it before the requirement is fixed or superseded)
- Method: test/core/state/boundedState.test.ts (scenario 6: "evicts the least recently set entry once the cap is exceeded", "reading an entry protects it from eviction, peek does not", "default capacity is 200 and rejects invalid capacities", "overwriting a key refreshes it and never grows the map")
- Criteria: STATE_THROTTLE_MS is 100 and the last state always reaches the host; preview.state equals the parsed state of the message; session.state is undefined when the render of the returned-to document builds its context, and initialAnchor is the stored anchor when it names that document; size never exceeds 200 and the order is least to most recent.
