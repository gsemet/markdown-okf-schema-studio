---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-214
uuid: 9d14a358-5347-4cb0-8170-25961a6342cb
title: The Diff button and the showIncomingChanges setting hide the change bars
description: When the page applies the Diff state, the page SHALL set the Diff
  button to pressed with the label Hide changes since last commit while the
  marks are shown, and to not pressed with the label Show changes since last
  commit while they are hidden, hide or show the change bars at once and post
  the incomingChanges view preference when the reader presses it, and show no
  change marks and no Diff button when
  markdownOkfSchemaStudio.preview.showIncomingChanges is false.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-017
depends_on:
- SwRS-MDOKFSTUDIO-LIFE-169
- SwRS-MDOKFSTUDIO-LIFE-170
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/configuration/settingsRegistry.ts
- src/page/modules/incomingToggle.ts
- src/session/features/viewState.ts
tested_in_files:
- test/page/runtimePageControls.test.ts
- test/session/toolbarReq.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## The Diff button and the showIncomingChanges setting hide the change bars

### Normative behavior

When the page applies the Diff state, the page SHALL set the Diff button to pressed with the label Hide changes since last commit while the marks are shown, and to not pressed with the label Show changes since last commit while they are hidden, hide or show the change bars at once and post the incomingChanges view preference when the reader presses it, and show no change marks and no Diff button when markdownOkfSchemaStudio.preview.showIncomingChanges is false.

### Scenario (nominal): The label follows the state

| Input | Outcome |
| --- | --- |
| Marks shown, the page starts | the button has aria-pressed true and its aria-label, title and tooltip read Hide changes since last commit |
| Marks hidden, the page starts | the button has aria-pressed false and reads Show changes since last commit |

### Scenario (nominal): Pressing the button

- GIVEN bars shown, then bars hidden
- WHEN the reader presses the Diff button, then presses it again
- THEN the first press hides the bar layer, posts the preference false and the host stops sending ranges; the second press shows the bars again and posts the preference true

### Scenario (nominal): The host refreshes the marks at once

- GIVEN a preview with marks shown
- WHEN the reader presses the Diff button
- THEN the host stores incomingChanges false and schedules the incoming-change update with no delay

### Scenario (refusal): Another preference schedules nothing

- GIVEN a change of the toc preference
- WHEN the host handles it
- THEN no incoming-change update is scheduled

### Scenario (boundary): The setting

| Input | Outcome |
| --- | --- |
| markdownOkfSchemaStudio.preview.showIncomingChanges false | the host posts enabled false with no ranges and the Diff button is hidden |
| The setting at its default true and a tracked file that differs from HEAD | the blocks are marked and the Diff button is visible |

### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-195: the host that posts the ranges and the enabled value.
- SwRS-MDOKFSTUDIO-REVIEW-207: the change bars the button hides.
- SwRS-MDOKFSTUDIO-TOOLBAR-001: the position of the button in the toolbar rows.

### Verification notes

- Method: test/page/runtimePageControls.test.ts (unit tests `T17: the initial preference and the saved webview state decide the pressed state`: scenario the label follows the state; `T17: the Diff button flips the marks, posts the preference and keeps the state`: scenarios the label follows the state, pressing the button; `T17: the Diff button is hidden through the document attribute when the setting is off`, `T16: previewIncomingChanges marks blocks and reports enabled, stale ids are ignored`: scenario the setting).
- Method: test/session/toolbarReq.requirements.test.ts (unit test: only the incoming-change preference schedules the update of the marks at once: scenarios the host refreshes the marks at once, another preference schedules nothing).
- Method: test/security/package-contract.test.ts (the setting is listed: scenario the setting). The default value is not asserted by a test.
- Method: visual scenarios review-annotations/v16-incoming-diff-off-light-900 and v05-change-bar-light-900 (scenario pressing the button).
- Criteria: The pressed state and the three texts match the state; data-sphinx-preview-incoming is off and the stylesheet hides the bar layer; schedule(preview, 0) runs only for the incomingChanges preference; package.json declares a boolean with default true and data-okf-incoming-changes false hides the button.
