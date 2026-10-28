---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-054
uuid: 2eb5b113-1760-4a75-8557-372f5e31324d
title: "Back and Next follow the host's history state"
description: "When the page starts, the page receives a history state for its render
  or the reader presses Back or Next, the extension SHALL keep both buttons disabled
  until the host reports a place to go to, enable each only when its flag in the state
  is true, and post one history move per press, which the host answers by moving,
  by posting the state again when there is nowhere to go, or by a warning when the
  document cannot be opened."
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-009
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-059
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/historyControls.ts
- src/session/features/history.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/integration/previewHistory.test.ts
- test/page/runtimePageControls.test.ts
- test/session/toolbarReq.requirements.test.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
---

## Back and Next follow the host's history state

### Normative behavior

When the page starts, the page receives a history state for its render or the reader presses Back or Next, the extension SHALL keep both buttons disabled until the host reports a place to go to, enable each only when its flag in the state is true, and post one history move per press, which the host answers by moving, by posting the state again when there is nowhere to go, or by a warning when the document cannot be opened.

### Scenario (boundary): Start disabled
- GIVEN a new preview page
- WHEN the buttons are read before any host message (the toolbar markup carries the disabled attribute on both)
- THEN both are disabled until the first previewHistoryState

### Scenario (nominal): State enables
- GIVEN a state with canBack true and canForward false
- WHEN the page applies the previewHistoryState of its render
- THEN Back is enabled and Next is disabled

### Scenario (boundary): Only true enables
- GIVEN a state with canBack missing and canForward 1
- WHEN the page applies it
- THEN both buttons are disabled, because only the value true enables (disabled = value !== true)

### Scenario (nominal): Press posts a move
| Input | Outcome |
| --- | --- |
| An enabled Back button is pressed | One previewHistoryGo with direction back is posted, with the page's document, revision and request identifiers |
| An enabled Next button is pressed | One previewHistoryGo with direction forward is posted, with the same identifiers |

### Scenario (refusal): Nowhere to go
- GIVEN a history with no previous place
- WHEN previewHistoryGo back arrives at the host
- THEN the host posts previewHistoryState with canBack false and opens nothing; with a previous place the move happens

### Scenario (refusal): Document cannot be opened
| Input | Outcome |
| --- | --- |
| Back to a place whose file was deleted | The warning "Markdown OKF-Schema Studio could not go back: {reason}" is shown with the reason of the error |
| Next to a place whose file cannot be opened | The warning "Markdown OKF-Schema Studio could not go forward: {reason}" is shown |
| Either move that fails | The history position and the list stay as they were, and the state posted afterwards enables Back and Next as before the press |

### Related requirements
- SwRS-MDOKFSTUDIO-TOOLBAR-059: the places that Back and Next move between are recorded there.

### Verification notes
- Method: test/core/preview/previewStyles.test.ts (Start disabled: toolbar markup test, disabled attribute).
- Method: test/page/runtimePageControls.test.ts (Start disabled, State enables, Only true enables and Press posts a move: T11, Back and Next post previewHistoryGo and follow previewHistoryState).
- Method: test/integration/previewHistory.test.ts (State enables: history.posted states).
- Method: test/visual/scenarioDefinitions2.ts (State enables: scenario toolbar-navigation/v30-back-enabled-after-anchor-light-900, Back enabled and Next disabled).
- Method: test/session/toolbarReq.requirements.test.ts (Nowhere to go: Back with nowhere to go only posts the history state again; Document cannot be opened: a Back or Next that cannot open its document shows a warning).
- Criteria: both buttons are disabled before the first previewHistoryState; disabled = (value !== true); exactly one message per press with the right direction; postHistoryState is called and no document is opened; host.ui.showWarning is called with the text and the error message.
