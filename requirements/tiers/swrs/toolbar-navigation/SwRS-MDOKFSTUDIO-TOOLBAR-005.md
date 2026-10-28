---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-005
uuid: ac9fc797-51b9-4ba8-bd47-184cfa34f1ea
title: Fold all and unfold all fold every section from the toolbar and the
  command palette
description: When the reader presses the Fold button of the toolbar, or runs the
  command Fold All Sections in Preview or Unfold All Sections in Preview, the
  extension SHALL fold every section that has content, or unfold every section,
  in the preview that has the focus.
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-002
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/previewToolbar.ts
- src/core/protocol/hostToPage.ts
- src/host-vscode/activation.ts
- src/page/features/hostHandlers.ts
- src/page/modules/headingFold.ts
- src/session/previewManager.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/page/modules/headingFold.test.ts
- test/security/package-contract.test.ts
- test/session/editCommands.test.ts
- test/visual/capture_layout_checks.py
default_owner_email: gaetan@xeberon.net
---

## Fold all and unfold all fold every section from the toolbar and the command palette

### Normative behavior

When the reader presses the Fold button of the toolbar, or runs the command Fold All Sections in Preview or Unfold All Sections in Preview, the extension SHALL fold every section that has content, or unfold every section, in the preview that has the focus.

### Scenario (nominal): Fold all and unfold all from the toolbar
- GIVEN a document with several sections and none folded
- WHEN the reader presses the Fold button in row 5 of the toolbar
- THEN every heading that has a section is folded, the button reads Unfold all sections with aria-pressed true; pressing it again unfolds every section and the button reads Fold all sections again

### Scenario (nominal): Fold all and unfold all from the command palette
- GIVEN a preview or the custom editor has the focus
- WHEN the reader runs Markdown OKF-Schema Studio: Fold All Sections in Preview or Unfold All Sections in Preview
- THEN the host posts previewFoldCommand with foldAll or unfoldAll to that preview and the page folds or unfolds every section

### Scenario (refusal): No preview, wrong command, open editor
| Input | Outcome |
| --- | --- |
| No preview has the focus | The command does nothing and returns false |
| A previewFoldCommand with a command other than foldAll or unfoldAll | The page refuses it |
| A block editor or the frontmatter editor is open | The page does not fold or unfold |
| The command palette while a text editor has the focus | The two entries are not offered (when: activeWebviewPanelId or activeCustomEditorId is the Studio's) |

### Verification notes

### Verification notes

- Method: test/page/modules/headingFold.test.ts (the Fold button folds every section that has content and unfolds them, its label and aria-pressed; nothing folds while an editor is open).
- Method: test/session/editCommands.test.ts (runFoldCommand posts the message to the focused preview and refuses when none is focused).
- Method: test/core/protocol/hostToPage.test.ts (the message is addressed to the render and refuses an unknown command).
- Method: test/security/package-contract.test.ts (the two commands and their palette conditions).
- Method: test/core/preview/previewStyles.test.ts (the Fold button of the toolbar).
- Method: test/visual/capture_layout_checks.py (check_heading_fold: the Fold button folds every section with content in Chromium, shows aria-pressed true, and a second press unfolds them).
- Criteria: after fold all each heading with a section carries data-okf-fold="closed"; after unfold all no block carries data-okf-folded.
