---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-177
uuid: e9393808-fcbc-480d-b76f-873412715494
title: Open as Text replaces a Studio tab by the text editor of the same file
description: When the reader runs Open as Text on a Studio tab, the extension
  SHALL open the text editor of the same file in the same group, at the line
  shown at the top of the Studio page when it is known, record that text editor
  as opened by Studio, and close the Studio tab.
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-023
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/host-vscode/activation.ts
tested_in_files:
- test/host/openAtLine.test.ts
- test/security/package-contract.test.ts
default_owner_email: gaetan@xeberon.net
---

## Open as Text replaces a Studio tab by the text editor of the same file

### Normative behavior

When the reader runs Open as Text on a Studio tab, the extension SHALL open the text editor of the same file in the same group, at the line shown at the top of the Studio page when it is known, record that text editor as opened by Studio, and close the Studio tab.

### Scenario (nominal): Open as Text on a Studio tab

- GIVEN a Studio tab of a Markdown file whose page shows source line 12 at the top
- WHEN the reader runs Open as Text
- THEN the text editor of the same file opens in the same group at line 12, it is not a preview tab, Studio records the file as opened by Studio, and the Studio tab is closed

### Scenario (boundary): No Studio tab, and the registry window

| Input | Outcome |
| --- | --- |
| the active tab is not a Studio tab | an information message asks to open a Markdown file in Studio first; nothing opens or closes |
| the line is not known | the text editor opens at line 1 |
| the text editor cannot be opened | an error message names the file and the cause, and the Studio tab stays |
| the file asked again 5 seconds after it was recorded | the registry no longer holds it |
| the command in the menus | in the Command Palette and the editor title overflow of a Studio tab only, never as a toolbar button |

### Verification notes

- Method: host tests in test/host/openAtLine.test.ts ("Open as Text on a Studio tab opens the text editor at the previewed line, closes the Studio tab and records the file", "Open as Text with no Studio tab active tells the reader and opens nothing", the registry window test), and the manifest test in test/security/package-contract.test.ts.
- Criteria: the text editor is shown with preview off, the Studio tab is closed, the file is recorded for 5000 ms.
- Boundary: the line carried by the page state is read from the session; the fake host does not render a page, so the line value is checked in a later round with the marker.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-023](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-023.md): A reader opens a Markdown file at a searched line and sees that line marked in Studio
<!-- okf:links:end -->
