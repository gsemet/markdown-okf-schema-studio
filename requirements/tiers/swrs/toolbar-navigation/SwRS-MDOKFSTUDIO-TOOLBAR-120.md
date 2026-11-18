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
  shows its document; a pairing message for another document, document version or
  request than the page's leaves the button unchanged, and the host accepts a mode
  change only when anchorToEditor is a boolean."
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-013
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-059
- SwRS-MDOKFSTUDIO-LIFE-169
- SwRS-MDOKFSTUDIO-LIFE-170
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-TRUST-006
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/hostToPage.ts
- src/core/protocol/pageToHost.ts
- src/page/features/anchorMode.ts
- src/session/features/scrollSync.ts
tested_in_files:
- test/core/preview/toolbarReq.requirements.test.ts
- test/core/protocol/pageStateMessages.test.ts
- test/integration/previewEditing.test.ts
- test/page/runtimePageControls.test.ts
- test/page/runtimeScroll.test.ts
- test/page/toolbarReq.runtime.requirements.test.ts
- test/session/toolbarReq.requirements.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-TOOLBAR-122
- SwRS-MDOKFSTUDIO-TOOLBAR-126
---

## The Anchor button switches whether the preview follows the editor

### Normative behavior

When the reader presses the enabled Anchor button, or the page learns whether a text editor shows its document, the extension SHALL show the anchor mode and the pairing on the button (data-anchor-mode, aria-pressed, label, title and tooltip, disabled while no text editor shows the file) and, when the mode is turned on, post to the preview the first visible line of each visible text editor that shows its document; a pairing message for another document, document version or request than the page's leaves the button unchanged, and the host accepts a mode change only when anchorToEditor is a boolean.

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

### Scenario (refusal): Foreign document

| Input | Outcome |
| --- | --- |
| a message for another document identity | the button does not change |
| a message for another document version or another request | the button does not change |

### Scenario (nominal): Own document

- GIVEN a message for the page's document
- WHEN the page receives it
- THEN the button follows it

### Scenario (nominal): Boolean

- GIVEN anchorToEditor true and false
- WHEN the validator runs
- THEN both are accepted

### Scenario (refusal): Not a boolean

- GIVEN the string true, the number 1 and a missing field
- WHEN the validator runs
- THEN all are refused

### Related requirements

- SwRS-MDOKFSTUDIO-LIFE-169: the anchor mode is stored for the workspace
- SwRS-MDOKFSTUDIO-LIFE-170: the first anchor mode of a page is the saved state's, else the setting

### Verification notes

- Method: test/page/runtimePageControls.test.ts (no text editor, a text editor shows the file: T38 an unpaired preview disables the anchor button and a previewPairing message re-enables it; already paired: T38 a paired preview keeps the anchor button enabled; the missing-field case is by code only)
- Method: test/page/runtimeScroll.test.ts (the mode and the button: restores saved editor anchoring when the configured preference changed)
- Method: test/integration/previewEditing.test.ts (the switch, previewAnchorModeChanged false, then true)
- Method: test/session/toolbarReq.requirements.test.ts (turning the mode on and off: turning the anchor mode on aligns the preview with the text editor)
- Method: test/core/preview/toolbarReq.requirements.test.ts (Initial state: the Anchor button of the markup is in the off mode, aria-pressed false, with the off title, and not disabled)
- Criteria: disabled = (pairedTextEditor === false); the three attributes follow the mode; syncEditorToPreview runs for the mode on only.
- Method: test/page/runtimePageControls.test.ts (T38 a paired preview keeps the anchor button enabled, and a foreign previewPairing is ignored; the own-document case is T38 an unpaired preview disables the anchor button and a previewPairing message re-enables it)
- Method: test/page/toolbarReq.runtime.requirements.test.ts (Foreign document and Own document: a pairing of another document, revision or request leaves the button as it is, both ways; a pairing of the page's own render disables it with the off title, then enables it again)
- Criteria: The host-message filter drops messages whose identifiers differ.
- Method: test/core/protocol/pageStateMessages.test.ts (both scenarios: the page-state validators accept exactly what the frozen validator accepted)
- Criteria: typeof anchorToEditor === boolean.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-013](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-013.md): The reader decides how the panes scroll together and sees the cursor block
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-059](../trust-security/SwRS-MDOKFSTUDIO-TRUST-059.md): The page accepts only registered host messages addressed to its render
  - [SwRS-MDOKFSTUDIO-LIFE-169](../lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-169.md): A view choice made on the page is stored for the workspace
  - [SwRS-MDOKFSTUDIO-LIFE-170](../lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-170.md): A new page starts each view choice from the panel, stored or default value
  - [SwRS-MDOKFSTUDIO-TRUST-052](../trust-security/SwRS-MDOKFSTUDIO-TRUST-052.md): Every page message has a registered type and a valid envelope before any handler runs
  - [SwRS-MDOKFSTUDIO-TRUST-065](../trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
  - [SwRS-MDOKFSTUDIO-TRUST-006](../trust-security/SwRS-MDOKFSTUDIO-TRUST-006.md): A preview with restricted reads keeps every viewing action
- Supersedes:
  - [SwRS-MDOKFSTUDIO-TOOLBAR-122](SwRS-MDOKFSTUDIO-TOOLBAR-122.md): A pairing message for another document is ignored
  - [SwRS-MDOKFSTUDIO-TOOLBAR-126](SwRS-MDOKFSTUDIO-TOOLBAR-126.md): The host accepts only a boolean anchor mode
<!-- okf:links:end -->
