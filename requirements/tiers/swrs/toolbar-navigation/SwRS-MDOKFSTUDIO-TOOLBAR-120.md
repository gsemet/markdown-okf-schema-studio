---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-120
uuid: c8155c41-f563-4865-b150-5c57a201265b
title: "The Anchor button switches whether the preview follows the editor"
description: "When the reader presses the enabled Anchor button, or the page learns
  whether a text editor shows its document, the extension SHALL show the anchor mode
  and the pairing on the button (data-anchor-mode, aria-pressed, label, title and
  tooltip, disabled while no text editor shows the file) and, when the mode is turned
  on, post to the preview the first visible line of each visible text editor that
  shows its document."
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-013
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-059
- SwRS-MDOKFSTUDIO-LIFE-169
- SwRS-MDOKFSTUDIO-LIFE-170
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/anchorMode.ts
- src/session/features/scrollSync.ts
tested_in_files:
- test/integration/previewEditing.test.ts
- test/page/runtimePageControls.test.ts
- test/page/runtimeScroll.test.ts
- test/session/toolbarReq.requirements.test.ts
---

## The Anchor button switches whether the preview follows the editor

### Normative behavior

When the reader presses the enabled Anchor button, or the page learns whether a text editor shows its document, the extension SHALL show the anchor mode and the pairing on the button (data-anchor-mode, aria-pressed, label, title and tooltip, disabled while no text editor shows the file) and, when the mode is turned on, post to the preview the first visible line of each visible text editor that shows its document.

### Scenario (nominal): The button switches the mode

| Input | Outcome |
| --- | --- |
| the enabled Anchor button in the off mode, pressed | data-anchor-mode is on, aria-pressed is true, the title and tooltip say Preview and text editor scroll together |
| the button in the on mode, pressed | data-anchor-mode is off, aria-pressed is false, the title and tooltip say Preview and text editor scroll independently |

### Scenario (boundary): Initial state

- GIVEN the toolbar markup before the page script runs
- WHEN the Anchor button is read
- THEN data-anchor-mode is off and aria-pressed is false

### Scenario (refusal): No text editor shows the file

- GIVEN a preview whose file is shown in no text editor and an anchor mode of on
- WHEN previewPairing arrives with pairedTextEditor false
- THEN the button is disabled, its label, title and tooltip say No text editor shows this file and aria-pressed is false

### Scenario (nominal): A text editor shows the file

| Input | Outcome |
| --- | --- |
| a disabled Anchor button, previewPairing with pairedTextEditor true | the button is enabled, its label is restored to Anchor preview to text editor and its title and tooltip show the mode of the moment |
| an enabled Anchor button, previewPairing with pairedTextEditor true | the button stays enabled and keeps its mode |

### Scenario (boundary): Pairing message without the field

- GIVEN a previewPairing message without the field pairedTextEditor
- WHEN the page applies it
- THEN the button is enabled, because only the value false means unpaired

### Scenario (nominal): Turning the mode on aligns the preview

- GIVEN a panel in the off mode and a visible text editor of the same file
- WHEN the mode is switched on
- THEN the preview receives a sourceScroll with the editor's first visible line and scrolls there, because the page follows the editor now

### Scenario (boundary): Turning the mode off

- GIVEN the mode switched off
- WHEN the host handles it
- THEN no sourceScroll is posted

### Related requirements

- SwRS-MDOKFSTUDIO-TOOLBAR-126: the host accepts only a boolean anchor mode from the page
- SwRS-MDOKFSTUDIO-TOOLBAR-122: a pairing message for another document is ignored
- SwRS-MDOKFSTUDIO-LIFE-169: the anchor mode is stored for the workspace
- SwRS-MDOKFSTUDIO-LIFE-170: the first anchor mode of a page is the saved state's, else the setting

### Verification notes

- Method: test/page/runtimePageControls.test.ts (no text editor, a text editor shows the file: T38 an unpaired preview disables the anchor button and a previewPairing message re-enables it; already paired: T38 a paired preview keeps the anchor button enabled; the missing-field case is by code only)
- Method: test/page/runtimeScroll.test.ts (the mode and the button: restores saved editor anchoring when the configured preference changed)
- Method: test/integration/previewEditing.test.ts (the switch, previewAnchorModeChanged false, then true)
- Method: test/session/toolbarReq.requirements.test.ts (turning the mode on and off: turning the anchor mode on aligns the preview with the text editor)
- Method: the initial state is untested (markup of the toolbar)
- Criteria: disabled = (pairedTextEditor === false); the three attributes follow the mode; syncEditorToPreview runs for the mode on only.
