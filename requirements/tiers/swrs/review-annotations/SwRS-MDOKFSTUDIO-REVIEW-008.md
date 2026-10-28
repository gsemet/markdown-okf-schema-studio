---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-008
uuid: 511de4c1-902d-4f50-b6af-c9d088e587f6
title: The Side-by-side button switches the diff and is disabled in edit mode
description: When the reader presses the Side-by-side button of toolbar row 3,
  the page SHALL toggle the side-by-side diff, set the button pressed state and
  label to match, post the new state to the host, and, while edit mode is on,
  disable the button, show no diff and leave the green change bars as they are.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-017
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/editMode.ts
- src/page/modules/sideBySide.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/integration/realWindowGaps.ts
- test/page/runtimePageControls.test.ts
- test/page/sideBySideCards.test.ts
- test/visual/capture_sbs_checks.py
default_owner_email: gaetan@xeberon.net
---

## The Side-by-side button switches the diff and is disabled in edit mode

### Normative behavior

When the reader presses the Side-by-side button of toolbar row 3, the page SHALL toggle the side-by-side diff, set the button pressed state and label to match, post the new state to the host, and, while edit mode is on, disable the button, show no diff and leave the green change bars as they are.

### Scenario (nominal): The button

| Input | Outcome |
| --- | --- |
| A page just loaded | the button is not pressed, labelled Show side-by-side changes since last commit, and the page attribute data-sphinx-preview-sbs is off |
| The reader presses the button | pressed, labelled Hide side-by-side changes since last commit, the attribute is on, and previewSideBySideChanged with on true is posted |
| The reader presses it again | the state goes back and on false is posted |

### Scenario (boundary): Edit mode

| Input | Outcome |
| --- | --- |
| Edit mode on | the button is disabled and its tooltip says it is not available in edit mode; a click posts nothing; no card is shown and the green bars stay |
| Edit mode off again | the button is enabled and the diff state is as it was |
### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-214: the Diff button next to it.
- SwRS-MDOKFSTUDIO-TOOLBAR-001: the toolbar rows.
- SwRS-MDOKFSTUDIO-REVIEW-007: the message it posts.

### Verification notes

- Method: test/page/runtimePageControls.test.ts (`CR147: the Side-by-side button toggles the diff, posts the state and is disabled in edit mode`), test/core/preview/previewStyles.test.ts (`CR147: the toolbar offers a Side-by-side button after the Diff button, not pressed at first`, `CR147: the side-by-side cards are two columns, switch off with the page attribute and never show in edit mode`); real window: scenario incoming-changes of test/integration/realInput.
- Criteria: The attributes, labels and posted messages equal the expected values in both states; the disabled attribute follows edit mode; the CSS shows no card in edit mode.
