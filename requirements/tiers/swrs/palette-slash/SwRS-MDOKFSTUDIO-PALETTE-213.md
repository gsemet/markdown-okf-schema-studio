---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-213
uuid: 6bbb8dbe-c6aa-49c8-9315-5eb72aebda3b
title: Pasted rich text is converted by the host and replaces the selection in
  one step
description: When the writer pastes into the block text box a clipboard that
  holds text/html of 1 to 1,000,000 characters and the paste is not a paste as
  plain text, the extension SHALL take over the paste, send the HTML to the host
  for conversion, and replace the selection of the moment of the paste with the
  Markdown answer in one undo step and autosave it, or with the plain text of
  the clipboard when the conversion fails or is empty, only if that editor is
  still open.
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-018
- StRS-MDOKFSTUDIO-PALETTE-001
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-TRUST-090
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/blockSourceEditor.ts
- src/page/modules/pasteHtml.ts
- src/session/features/hostRequests.ts
tested_in_files:
- test/core/protocol/pageToHost.test.ts
- test/page/paletteReq.requirements.test.ts
- test/page/runtimePaletteActions.test.ts
- test/visual/scenarioDefinitions1.ts
default_owner_email: gaetan@xeberon.net
---

## Pasted rich text is converted by the host and replaces the selection in one step

### Normative behavior

When the writer pastes into the block text box a clipboard that holds text/html of 1 to 1,000,000 characters and the paste is not a paste as plain text, the extension SHALL take over the paste, send the HTML to the host for conversion, and replace the selection of the moment of the paste with the Markdown answer in one undo step and autosave it, or with the plain text of the clipboard when the conversion fails or is empty, only if that editor is still open.

### Scenario (nominal): Rich text becomes Markdown
- GIVEN a block editor with a selection and a clipboard that holds HTML with a heading, bold text, a link and a list
- WHEN the writer pastes
- THEN the default paste is prevented, previewPasteHtml is posted with the html and the selection of the moment of the paste is remembered
- GIVEN that request
- WHEN the host answers the Markdown conversion
- THEN the selection is replaced by the Markdown in one native edit with the caret after it, one undo restores the text and the edit is autosaved; the conversion rules are those of SwRS-MDOKFSTUDIO-PALETTE-217
- The envelope, the render gate and the answer correlation (10 seconds) are those of SwRS-MDOKFSTUDIO-TRUST-052, SwRS-MDOKFSTUDIO-TRUST-065 and SwRS-MDOKFSTUDIO-TRUST-090.

### Scenario (nominal): The host converts without touching a file
- GIVEN an HTML fragment with a heading
- WHEN previewPasteHtml is accepted, in any preview, including a read-only one since it edits nothing
- THEN the answer previewPasteHtmlResult is ok true and holds the Markdown of the heading, and no file is touched
- GIVEN a conversion that throws
- WHEN the host answers
- THEN the answer is ok false with the message of the error as the reason

### Scenario (boundary): The paste stays with the browser
No conversion is requested and the browser pastes the plain text.

| Case | Outcome |
| --- | --- |
| Cmd+Shift+V or Ctrl+Shift+V pressed just before the paste | plain paste; the mark is cleared by the next key that is not a modifier (Shift, Meta, Control, Alt) |
| clipboard with text only, or with no html | native paste |
| clipboard with a blank html text | native paste |
| clipboard with 1,000,001 characters of html | native paste |
| clipboard that holds an image only | not converted (the image paste is that of SwRS-MDOKFSTUDIO-PALETTE-203) |
| text box of a table cell editor, whatever the clipboard holds (an image or html) | native paste; no image is sent and no conversion is requested, since only the text box of the block editor installs the image and rich text paste hooks |

### Scenario (refusal): The conversion fails or the editor is gone
| Case | Outcome |
| --- | --- |
| answer with ok false or empty Markdown | the plain text of the clipboard is inserted instead, over the remembered selection, in one undo step |
| both the Markdown and the plain text empty | nothing is inserted |
| editor closed, replaced or finishing when the answer arrives | nothing is inserted |
| answer for another edit | ignored |
| remembered positions beyond the text | clamped to the length of the text before the insertion |

### Scenario (boundary): The message shape
| previewPasteHtml field | Accepted | Otherwise |
| --- | --- | --- |
| html | a non-empty string of at most 1,000,000 characters | the protocol rejects the message (an empty text or one over 1,000,000 characters) |
| edit id | as for every host request | the protocol rejects the message |

### Related requirements
- SwRS-MDOKFSTUDIO-PALETTE-217: the Markdown the host answers for each HTML element.
- SwRS-MDOKFSTUDIO-PALETTE-203: an image on a clipboard without text is read and sent to the host.

### Verification notes
- Method: test/page/runtimePaletteActions.test.ts (rich text asks the host for Markdown and the answer replaces the selection; a failed or empty conversion inserts the plain text; Cmd+Shift+V, an image paste and a clipboard without HTML stay untouched)
- Method: test/page/paletteReq.requirements.test.ts (pasting into the text box of a table cell editor stays native, whatever the clipboard holds)
- Method: test/core/protocol/pageToHost.test.ts (previewPasteHtml accepts a bounded non-empty HTML string with an edit id)
- Method: visual scenarios in test/visual/scenarioDefinitions1.ts, block-editing/v15 (dark, 460 px) and v16 (light, 900 px) (rich text with a heading, bold text, a link and a list replaces the selection in one native edit, one undo restores the text, autosave)
- Method: untested, deduced from the code (pasteHtml.ts, hostRequests.ts, blockSourceEditor.ts): the page length limit (MAX_HTML_LENGTH), the error answer of the host, the guard for a closed editor and the clamp of the positions
- Criteria: A blank html text is not taken over; nothing is inserted when both the Markdown and the plain text are empty; the insert hook clamps the range to the text length and applies one text edit followed by the autosave.
