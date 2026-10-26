---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-010
uuid: cd944884-1089-48f9-a915-979bec19ebb9
title: Open Preview to Side checks the file it is given
description: "When Open Preview to Side runs, the extension SHALL preview only a saved
  file with the extension .md, taken from the active editor (a text editor, or the
  Studio Open With tab) or from a file URI the command receives, ignore an argument
  that is not a URI of the file scheme, and otherwise show the message Open a Markdown
  file to use Markdown OKF-Schema Studio. or the error Cannot open {path}: {reason}
  and open no preview."
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/host-vscode/activation.ts
tested_in_files:
- test/host/lifeReq.requirements.test.ts
- test/integration/lifecycle.test.ts
---

## Open Preview to Side checks the file it is given

### Normative behavior

When Open Preview to Side runs, the extension SHALL preview only a saved file with the extension .md, taken from the active editor (a text editor, or the Studio Open With tab) or from a file URI the command receives, ignore an argument that is not a URI of the file scheme, and otherwise show the message Open a Markdown file to use Markdown OKF-Schema Studio. or the error Cannot open {path}: {reason} and open no preview.

### Scenario (refusal): Not a saved Markdown file

- GIVEN a TypeScript file in the active editor
- WHEN the command runs from the Command Palette
- THEN the information message Open a Markdown file to use Markdown OKF-Schema Studio. shows and no preview opens

### Scenario (nominal): Studio Open With tab active

- GIVEN a Studio Open With tab of a saved .md file is the active tab, so no text editor is active
- WHEN the command runs from the Command Palette
- THEN the file of that tab opens in the side preview and no refusal message shows (the keybinding and the editor-title button are not offered while a custom editor has the focus)

### Scenario (refusal): Another custom editor active

- GIVEN the active tab is a custom editor of another type, so no text editor is active
- WHEN the command runs from the Command Palette
- THEN the message Open a Markdown file to use Markdown OKF-Schema Studio. shows and no preview opens

### Scenario (boundary): Eligible and ineligible files

| Input | Outcome |
| --- | --- |
| a file with the scheme file and the extension .md | previewed |
| README.MD | accepted: the extension check is case-insensitive |
| notes.markdown | refused with the message above |
| an untitled document | refused with the message above |

### Scenario (nominal): File passed by a menu

- GIVEN a side preview in group two, preview.md active, and preview-other.md chosen in the Explorer
- WHEN the reader runs the Explorer entry Open Preview to Side on preview-other.md
- THEN preview-other.md opens as a permanent tab outside the preview's group, becomes the active editor and the side preview shows it (integration test test/integration/lifecycle.test.ts, the passed Uri is the active text editor)
- AND without a side preview the file opens in the active group (by reading openPreview)

### Scenario (boundary): Argument that is not the file to open

| Input | Outcome |
| --- | --- |
| the URI names the file of the active editor | the file is not opened again and the active editor is previewed |
| the argument { not: "a uri" } with a side preview of preview-other.md | ignored; the preview still shows preview-other.md (integration test test/integration/lifecycle.test.ts) |
| a URI whose scheme is not file | ignored the same way, because only the file scheme passes the check (deduced from the code, not run) |

### Scenario (refusal): A file that cannot be opened

| Input | Outcome |
| --- | --- |
| a file URI of a file deleted after the menu was drawn | an error message Cannot open {path}: {reason} names the path and the reason, and no preview opens or changes |
| the failure is not an Error object | the reason is the failure converted to a string |

### Related requirements

- SwRS-MDOKFSTUDIO-LIFE-003: the side preview this command opens or reveals.

### Verification notes

- Method: test/host/lifeReq.requirements.test.ts, unit tests "Open Preview to Side refuses a file that is not a saved Markdown file" (Not a saved Markdown file, Eligible and ineligible files: reads isDocumentEligible, file scheme, .md extension, case-insensitive, and openPreview; the notes.markdown and untitled cases and the README.MD acceptance are by reading isDocumentEligible) and "Open Preview to Side reports a file it cannot open" (A file that cannot be opened: reads the catch block of openPreview).
- Method: test/host/lifeReq.requirements.test.ts, unit test "Open Preview to Side from a Studio Open With tab previews that tab's file" (Studio Open With tab active, Another custom editor active: the fake window reports a custom editor tab and no text editor).
- Method: test/integration/lifecycle.test.ts (File passed by a menu: runs the command with secondDocument.uri and asserts the preview document and that the passed Uri is the active text editor; Argument that is not the file to open: asserts the plain-object case; the other-scheme case is untested; the already-active case is by reading the code).
- Criteria: The information message reads Open a Markdown file to use Markdown OKF-Schema Studio. and no panel is created; preview.documentUri and the active text editor equal the passed URI; the preview document is unchanged after an ignored argument; the error message starts with Cannot open and the file path.
