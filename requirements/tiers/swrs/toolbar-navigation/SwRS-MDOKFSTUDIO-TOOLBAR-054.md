---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-054
uuid: 2eb5b113-1760-4a75-8557-372f5e31324d
title: "Back and Next follow the host's history state"
description: "When the page starts, the page receives a history state for its render
  or the reader presses Back or Next, the extension SHALL keep both buttons disabled
  until the host reports a place to go to, enable each only when its flag in a state
  for the page's own render is true (a state of another render is ignored), and post
  one history move per press, which the host accepts only when its direction is back
  or forward and it names the current render, and answers by moving, by posting the
  state again when there is nowhere to go, or by a warning when the document cannot
  be opened."
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-009
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-059
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-TRUST-006
scenarios:
- id: S1
  title: Start disabled
- id: S2
  title: State enables
- id: S3
  title: Only true enables
- id: S4
  title: Press posts a move
- id: S5
  title: Nowhere to go
- id: S6
  title: Document cannot be opened
- id: S7
  title: A history state of another render is ignored
- id: S8
  title: The host accepts only back or forward
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/hostToPage.ts
- src/core/protocol/pageToHost.ts
- src/page/modules/historyControls.ts
- src/session/features/history.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/core/protocol/pageToHost.test.ts
- test/integration/previewHistory.test.ts
- test/page/runtimePageControls.test.ts
- test/page/toolbarReq.runtime.requirements.test.ts
- test/session/toolbarReq.requirements.test.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-TOOLBAR-056
- SwRS-MDOKFSTUDIO-TOOLBAR-058
---

## Back and Next follow the host's history state

### Normative behavior

When the page starts, the page receives a history state for its render or the reader presses Back or Next, the extension SHALL keep both buttons disabled until the host reports a place to go to, enable each only when its flag in a state for the page's own render is true (a state of another render is ignored), and post one history move per press, which the host accepts only when its direction is back or forward and it names the current render, and answers by moving, by posting the state again when there is nowhere to go, or by a warning when the document cannot be opened.

### Scenario S1 (boundary): Start disabled
- GIVEN a new preview page
- WHEN the buttons are read before any host message (the toolbar markup carries the disabled attribute on both)
- THEN both are disabled until the first previewHistoryState

### Scenario S2 (nominal): State enables
- GIVEN a state with canBack true and canForward false
- WHEN the page applies the previewHistoryState of its render
- THEN Back is enabled and Next is disabled

### Scenario S3 (boundary): Only true enables
- GIVEN a state with canBack missing and canForward 1
- WHEN the page applies it
- THEN both buttons are disabled, because only the value true enables (disabled = value !== true)

### Scenario S4 (nominal): Press posts a move
| Input | Outcome |
| --- | --- |
| An enabled Back button is pressed | One previewHistoryGo with direction back is posted, with the page's document, revision and request identifiers |
| An enabled Next button is pressed | One previewHistoryGo with direction forward is posted, with the same identifiers |

### Scenario S5 (refusal): Nowhere to go
- GIVEN a history with no previous place
- WHEN previewHistoryGo back arrives at the host
- THEN the host posts previewHistoryState with canBack false and opens nothing; with a previous place the move happens

### Scenario S6 (refusal): Document cannot be opened
| Input | Outcome |
| --- | --- |
| Back to a place whose file was deleted | The warning "Markdown OKF-Schema Studio could not go back: {reason}" is shown with the reason of the error |
| Next to a place whose file cannot be opened | The warning "Markdown OKF-Schema Studio could not go forward: {reason}" is shown |
| Either move that fails | The history position and the list stay as they were, and the state posted afterwards enables Back and Next as before the press |

### Scenario S7 (refusal): A history state of another render is ignored

| Input | Outcome |
| --- | --- |
| a state with an older or different revision (for example 99 for a page at 7) | the buttons keep their state |
| a state for another document | ignored in the same way |
| a state for another request | ignored in the same way |
| a state with the page's identifiers (the current render) | the buttons follow it (nominal row) |

### Scenario S8 (refusal): The host accepts only back or forward

| Input | Outcome |
| --- | --- |
| a previewHistoryGo with direction back or forward | accepted |
| the direction up, an empty string or a missing direction | refused |
| a previewHistoryGo that names a render other than the shown one | refused by the render gate (see SwRS-MDOKFSTUDIO-TRUST-065) |

### Related requirements
- SwRS-MDOKFSTUDIO-TOOLBAR-059: the places that Back and Next move between are recorded there.

### Verification notes
- Method: test/core/preview/previewStyles.test.ts (Start disabled: toolbar markup test, disabled attribute).
- Method: test/page/runtimePageControls.test.ts (Start disabled, State enables, Only true enables and Press posts a move: T11, Back and Next post previewHistoryGo and follow previewHistoryState).
- Method: test/integration/previewHistory.test.ts (State enables: history.posted states).
- Method: test/visual/scenarioDefinitions2.ts (State enables: scenario toolbar-navigation/v30-back-enabled-after-anchor-light-900, Back enabled and Next disabled).
- Method: test/session/toolbarReq.requirements.test.ts (Nowhere to go: Back with nowhere to go only posts the history state again; Document cannot be opened: a Back or Next that cannot open its document shows a warning).
- Method: test/page/runtimePageControls.test.ts (a previewHistoryState of another document version is ignored) and test/core/protocol/pageToHost.test.ts (previewHistoryGo accepts only back or forward); test/session/toolbarReq.requirements.test.ts (A history state of another render: a previewHistoryGo that names another document, revision or request is refused by the render gate, posts nothing and leaves the history where it is; the current render's move goes back).
- Criteria: both buttons are disabled before the first previewHistoryState; disabled = (value !== true); exactly one message per press with the right direction; postHistoryState is called and no document is opened; host.ui.showWarning is called with the text and the error message.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-009](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-009.md): The reader goes Back and Next through followed links without losing typed text
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-052](../trust-security/SwRS-MDOKFSTUDIO-TRUST-052.md): Every page message has a registered type and a valid envelope before any handler runs
  - [SwRS-MDOKFSTUDIO-TRUST-059](../trust-security/SwRS-MDOKFSTUDIO-TRUST-059.md): The page accepts only registered host messages addressed to its render
  - [SwRS-MDOKFSTUDIO-TRUST-065](../trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
  - [SwRS-MDOKFSTUDIO-TRUST-006](../trust-security/SwRS-MDOKFSTUDIO-TRUST-006.md): A preview with restricted reads keeps every viewing action
- Supersedes:
  - [SwRS-MDOKFSTUDIO-TOOLBAR-056](SwRS-MDOKFSTUDIO-TOOLBAR-056.md): A history state of another render is ignored
  - [SwRS-MDOKFSTUDIO-TOOLBAR-058](SwRS-MDOKFSTUDIO-TOOLBAR-058.md): The host accepts only back or forward
<!-- okf:links:end -->
