---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-177
uuid: e9393808-fcbc-480d-b76f-873412715494
title: Open as Text replaces a Studio tab by the text editor of the same file
description: When the reader runs Open as Text on a Studio tab, the extension
  SHALL open the text editor of the same file in the same group, at the line
  shown at the top of the Studio page when it is known, close the Studio tab,
  and never replace that text editor by Studio, with or without the editor
  association of Markdown files.
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-023
scenarios:
- id: S1
  title: Open as Text on a Studio tab
- id: S2
  title: No Studio tab, and a text editor that stays
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/host-vscode/activation.ts
tested_in_files:
- test/host/openAtLine.test.ts
- test/integration/openAtLine.test.ts
- test/security/package-contract.test.ts
default_owner_email: gaetan@xeberon.net
---

## Open as Text replaces a Studio tab by the text editor of the same file

### Normative behavior

When the reader runs Open as Text on a Studio tab, the extension SHALL open the text editor of the same file in the same group, at the line shown at the top of the Studio page when it is known, close the Studio tab, and never replace that text editor by Studio, with or without the editor association of Markdown files.

### Scenario S1 (nominal): Open as Text on a Studio tab

- GIVEN a Studio tab of a Markdown file whose page shows source line 12 at the top
- WHEN the reader runs Open as Text
- THEN the text editor of the same file opens in the same group at line 12, it is not a preview tab, the side preview marks no line for that opening, the Studio tab is closed, and the text editor stays the active tab

### Scenario S2 (boundary): No Studio tab, and a text editor that stays

| Input | Outcome |
| --- | --- |
| the active tab is not a Studio tab | an information message asks to open a Markdown file in Studio first; nothing opens or closes |
| the line is not known | the text editor opens at line 1 |
| the text editor cannot be opened | an error message names the file and the cause, and the Studio tab stays |
| a Markdown text editor opened by any other way, "Open With... > Text Editor" or "Reopen Editor With... > Text Editor" included, with the Studio association set or not | the extension closes no tab and opens no other editor in its place |
| the command in the menus | in the Command Palette and the editor title overflow of a Studio tab only, never as a toolbar button |

### Verification notes

- Method: host tests in test/host/openAtLine.test.ts ("Open as Text on a Studio tab opens the text editor at the previewed line in the same column, closes the Studio tab and expects the selection as no-mark", "Open as Text with no Studio tab active tells the reader and opens nothing", the two "is never closed or replaced" tests), the manifest test in test/security/package-contract.test.ts, and the real-window test test/integration/openAtLine.test.ts (with and without the association: a plain opening, a jump at a line and vscode.openWith "default" stay text tabs; under the association a plain opening is a Studio tab and Open as Text turns it into a text tab that stays; a jump under the association opens Studio at the top with no marker; a jump with the file already open as text keeps that tab and opens a Studio tab beside it).
- Criteria: the text editor is shown with preview off, the Studio tab is closed, and no tab of the extension's making replaces a text editor.
- Boundary: the line carried by the page state is read from the session; the fake host does not render a page, so the line value is checked in a later round with the marker.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-023](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-023.md): A reader sees the line of a jump marked in the side preview, opens Studio at a line, and gets the raw text on request
<!-- okf:links:end -->
