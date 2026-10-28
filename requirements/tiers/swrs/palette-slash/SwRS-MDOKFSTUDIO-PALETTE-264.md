---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-264
uuid: 7062ad3e-5926-4afe-a2dd-6aa6b6671cfe
title: A pasted URL becomes a link, an autolink or an image in the block text
  box
description: When the writer pastes into the block text box a clipboard whose
  plain text is a single http, https or mailto address and that holds no
  text/html, and the paste is not a paste as plain text, the extension SHALL
  replace the selection of the paste with [selected text](url) when text is
  selected, with <url> when nothing is selected, and with ![alt](url) for an
  http or https address whose path ends in .png, .jpg, .jpeg, .gif, .svg or
  .webp, in one undo step, leaving the rest of the source unchanged.
project: MDOKFSTUDIO
scope: palette-slash
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-018
- StRS-MDOKFSTUDIO-PALETTE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/blockSourceEditor.ts
- src/page/modules/pasteUrl.ts
tested_in_files:
- test/build/integrationEditModeRestore.test.ts
- test/integration/pasteUrl.test.ts
- test/page/modules/pasteUrl.test.ts
- test/page/runtimePaletteActions.test.ts
---

## A pasted URL becomes a link, an autolink or an image in the block text box

### Normative behavior

When the writer pastes into the block text box a clipboard whose plain text is a single http, https or mailto address and that holds no text/html, and the paste is not a paste as plain text, the extension SHALL replace the selection of the paste with [selected text](url) when text is selected, with <url> when nothing is selected, and with ![alt](url) for an http or https address whose path ends in .png, .jpg, .jpeg, .gif, .svg or .webp, in one undo step, leaving the rest of the source unchanged.

### Scenario (nominal): The URL over selected text makes a link
- GIVEN a block editor with the text "see the docs" selected and a clipboard whose plain text is "https://example.com/docs" with no text/html
- WHEN the writer pastes
- THEN the default paste is prevented and the selection becomes "[see the docs](https://example.com/docs)" in one native edit with the caret after it, autosaved; one undo restores the text

### Scenario (nominal): The URL alone makes an autolink or an image
- GIVEN a block editor with a collapsed caret and a clipboard whose plain text is "https://example.com/docs"
- WHEN the writer pastes
- THEN the URL wrapped in angle brackets (an autolink) is inserted at the caret
- GIVEN the same editor and a clipboard whose plain text is "https://example.com/logo.png"
- WHEN the writer pastes
- THEN "![](https://example.com/logo.png)" is inserted with the caret in the empty alt text; with text selected the selection becomes the alt text, "![text](url)"

### Scenario (boundary): The paste stays with the browser
| Case | Outcome |
| --- | --- |
| Cmd+Shift+V or Ctrl+Shift+V pressed just before the paste (paste as plain text) | the raw text is pasted; the mark is cleared by the next key that is not a modifier |
| clipboard that also holds text/html | rich text paste of SwRS-MDOKFSTUDIO-PALETTE-213 |
| scheme other than http, https or mailto (javascript:, data:, file:, ftp:) | native paste |
| text that is more than one address, holds a space or a line break, or is longer than 2048 characters | native paste |
| caret in a fenced code block, an inline code span or the target of a link, or a selection that holds a line break, [ or ] | native paste |
| text box of a table cell editor | native paste (it installs no paste hook) |

### Scenario (boundary): The image extension
| Address | Outcome |
| --- | --- |
| http or https, path ends in .png, .jpg, .jpeg, .gif, .svg or .webp (case-insensitive, query and hash ignored) | image `![alt](url)` |
| mailto address, or any other path | link or autolink |
| destination with ( or ) | written in angle brackets, `[text](<url>)` |

### Related requirements
- SwRS-MDOKFSTUDIO-PALETTE-213: rich text on the clipboard is converted by the host.
- SwRS-MDOKFSTUDIO-PALETTE-203: an image on a clipboard without text is saved by the host.

### Verification notes
- Method: test/page/modules/pasteUrl.test.ts (the edit for each case of the tables, the scheme rule and the plain text mark)
- Method: test/page/runtimePaletteActions.test.ts (a URL pasted into the text box of a block editor makes a link, an autolink or an image; Cmd+Shift+V, rich text and other schemes stay untouched)
- Method: test/integration/pasteUrl.test.ts (real VS Code window: real clipboard paste, the autosave writes only the pasted spans; the scenario turns edit mode off again and waits until the workspace remembers it, CR 152, checked by test/build/integrationEditModeRestore.test.ts)
- Criteria: the text outside `[start, end)` of the text box is identical before and after the paste.
