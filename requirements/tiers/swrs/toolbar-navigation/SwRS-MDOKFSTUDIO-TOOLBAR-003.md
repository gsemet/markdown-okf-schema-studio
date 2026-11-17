---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-003
uuid: 2c6fc602-53b5-4aee-93d8-11f009c21871
title: A chevron folds the section under a heading, and Fold all folds every
  section
description: "When the reader presses the chevron of a heading of the content, or
  the section shortcut with that heading current, the extension SHALL hide every block
  after the heading up to the next heading of the same or a higher level, keep the
  heading shown with its chevron marked folded, and show the blocks again when the
  chevron is pressed again; and when the reader presses the Fold button of the toolbar,
  or runs the command Fold All Sections in Preview or Unfold All Sections in Preview,
  fold every section that has content, or unfold every section, in the preview that
  has the focus."
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-002
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/previewToolbar.ts
- src/core/preview/styles/contentLayoutStyles.ts
- src/core/protocol/hostToPage.ts
- src/core/state/headingFold.ts
- src/host-vscode/activation.ts
- src/page/features/hostHandlers.ts
- src/page/modules/headingFold.ts
- src/session/previewManager.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/core/state/headingFold.test.ts
- test/page/modules/headingFold.test.ts
- test/security/package-contract.test.ts
- test/session/editCommands.test.ts
- test/visual/capture_layout_checks.py
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-TOOLBAR-005
---

## A chevron folds the section under a heading, and Fold all folds every section

### Normative behavior

When the reader presses the chevron of a heading of the content, or the section shortcut with that heading current, the extension SHALL hide every block after the heading up to the next heading of the same or a higher level, keep the heading shown with its chevron marked folded, and show the blocks again when the chevron is pressed again; and when the reader presses the Fold button of the toolbar, or runs the command Fold All Sections in Preview or Unfold All Sections in Preview, fold every section that has content, or unfold every section, in the preview that has the focus.

### Scenario (nominal): Fold a section
- GIVEN content with an h2 B followed by two paragraphs, an h3 C with a paragraph, and then an h2 D
- WHEN the reader presses the chevron of B
- THEN the two paragraphs, C and its paragraph are hidden (data-okf-folded, hidden="until-found"), B and D stay shown, the chevron of B has aria-expanded false and the heading has data-okf-fold="closed"; pressing it again shows the blocks and sets data-okf-fold="open"

### Scenario (boundary): Which headings fold and where a section ends
| Input | Outcome |
| --- | --- |
| A heading directly followed by a heading of the same or a higher level, or by nothing | It has no chevron, because its section is empty |
| An h3 inside a folded h2 that is itself folded | It stays hidden until the h2 opens; its own fold state is kept |
| A folded h3 followed by an h2 | The section ends at the h2, which stays shown |
| A heading inside an admonition or the properties table | It is not a top-level block of the content and has no chevron |
| The chevron is pressed in edit mode | The click is taken by the chevron: no block editor opens and the editor does not reveal the source |
| The chevron is pressed while a block editor or the frontmatter editor is open | Nothing folds |
| The section shortcut (Ctrl+Alt+[, Cmd+Alt+[ on macOS) with focus outside a text box | The section of the focused heading, or of the last heading at the reading line, folds or unfolds; a heading without a section stands for the heading above it; the key typed in a text box does nothing |

### Scenario (nominal): The chevron is shown when it is useful
- GIVEN a heading with a section
- WHEN the pointer is over the heading, the chevron has the focus, or the section is folded
- THEN the chevron is visible; otherwise it is transparent but still reachable by keyboard

### Scenario (boundary): Folded blocks take no room
- GIVEN a folded section
- WHEN the page is laid out
- THEN the hidden blocks have no margin, padding or border, so the folded heading is followed by the next heading at the spacing of two headings

### Scenario (nominal): Fold all and unfold all from the toolbar
- GIVEN a document with several sections and none folded
- WHEN the reader presses the Fold button in row 3 of the toolbar
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

- Method: test/core/state/headingFold.test.ts (planHeadingFold: the hidden range of a folded heading, the nesting and an empty section; sectionEnd and hasSection).
- Method: test/page/modules/headingFold.test.ts (a chevron only on a heading with a section; pressing it folds up to the next heading of the same level, marks aria-expanded and data-okf-fold, stops the click, and a second press unfolds; the shortcut folds the section at the reading line or the focused heading, accepts Cmd as Ctrl and ignores a text box and other chords).
- Method: test/core/preview/previewStyles.test.ts (the chevron rules: hover, focus and folded visibility; the spacing of a folded block).
- Method: real-window screenshots of a folded document in the cream and a dark theme (CR 143, reports/shots).
- Method: test/visual/capture_layout_checks.py (check_heading_fold, run on every toolbar scenario in Chromium: the Fold button folds the sections, the folded blocks are hidden until found, keep no height and leave the headings shown, the text is unchanged, and a chevron folds and unfolds one section).
- Criteria: hidden blocks equal the blocks between the heading and the next heading of the same or a higher level; the heading stays shown; no document text changes.
- Method: test/page/modules/headingFold.test.ts (the Fold button folds every section that has content and unfolds them, its label and aria-pressed; nothing folds while an editor is open).
- Method: test/session/editCommands.test.ts (runFoldCommand posts the message to the focused preview and refuses when none is focused).
- Method: test/core/protocol/hostToPage.test.ts (the message is addressed to the render and refuses an unknown command).
- Method: test/security/package-contract.test.ts (the two commands and their palette conditions).
- Method: test/core/preview/previewStyles.test.ts (the Fold button of the toolbar).
- Method: test/visual/capture_layout_checks.py (check_heading_fold: the Fold button folds every section with content in Chromium, shows aria-pressed true, and a second press unfolds them).
- Criteria: after fold all each heading with a section carries data-okf-fold="closed"; after unfold all no block carries data-okf-folded.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-002](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-002.md): The reader folds and unfolds the sections of the document
- Supersedes:
  - [SwRS-MDOKFSTUDIO-TOOLBAR-005](SwRS-MDOKFSTUDIO-TOOLBAR-005.md): Fold all and unfold all fold every section from the toolbar and the command palette
<!-- okf:links:end -->
