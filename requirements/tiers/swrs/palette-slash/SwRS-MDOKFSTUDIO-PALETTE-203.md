---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-203
uuid: 23975131-d3a4-4b94-aa1a-18cb64c12f27
title: A pasted image is sent to the host and its name inserted on its own
  paragraph
description: When the writer pastes into the block text box a clipboard that
  holds no text and a png, jpeg, gif or webp file of at most 10 MB, the
  extension SHALL take over the paste, remember the selection, read the first
  such file as base64, send it to the host with its type, and when the host
  answers a file name replace the remembered selection with ![name](name) as a
  paragraph of its own, showing any refusal or read failure in the status line
  and inserting nothing.
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-018
- StRS-MDOKFSTUDIO-PALETTE-013
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-090
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/pasteImage.ts
tested_in_files:
- test/page/modules/paletteReq.requirements.test.ts
- test/page/modules/pasteImage.test.ts
- test/page/runtimePaletteActions.test.ts
default_owner_email: gaetan@xeberon.net
---

## A pasted image is sent to the host and its name inserted on its own paragraph

### Normative behavior

When the writer pastes into the block text box a clipboard that holds no text and a png, jpeg, gif or webp file of at most 10 MB, the extension SHALL take over the paste, remember the selection, read the first such file as base64, send it to the host with its type, and when the host answers a file name replace the remembered selection with ![name](name) as a paragraph of its own, showing any refusal or read failure in the status line and inserting nothing.

### Scenario (nominal): A screenshot is saved and inserted
- GIVEN a clipboard with one png file and no text, and a block editor with a selection
- WHEN the writer pastes
- THEN the default paste is prevented, the selection is remembered, the status line shows Saving image… and previewPasteImage is posted with the type image/png and the base64 data
- GIVEN that request
- WHEN the host answers image.png
- THEN the reference is inserted over the remembered selection (not the live one), the edit is autosaved and the status line shows its usual text again
- The host side of this request is SwRS-MDOKFSTUDIO-PALETTE-196; the answer correlation is SwRS-MDOKFSTUDIO-TRUST-090.

### Scenario (boundary): What the paste hook takes over
| Clipboard | Outcome |
| --- | --- |
| text and an image | the paste stays native and nothing is sent to the host (text wins) |
| an item of another type, such as svg | the item is ignored and the paste stays native |
| no file at all | the paste stays native |
| several png, jpeg, gif or webp files, no text | the first such file is read and sent |
| an image of 1 MB | the image is sent to the host |
| an image of 11 MB | the paste is prevented, the status line shows The image is larger than 10 MB and was not pasted. and nothing is posted (the limit is 10 times 1024 times 1024 bytes) |

### Scenario (refusal): The image cannot be read or the host refuses it
Each case inserts nothing. The status line changes only while the editor and text box that received the paste are the open ones and not finishing.

| Case | Status line |
| --- | --- |
| the file reader fails (a failing reader) | The image could not be read. (nothing is posted) |
| the editor closed meanwhile and the reader fails | not touched |
| the host answers a refusal with a reason | that reason |
| the host answers a refusal without a reason | The image was not saved. |
| the host answers an edit id that is not the pending one | ignored |
| the editor closed or is finishing when the answer arrives | not touched and nothing is inserted |

### Scenario (nominal): The reference goes on a paragraph of its own
The alternative text equals the file name; no dialog asks for it.

| Text around the selection | Result |
| --- | --- |
| caret at the end of a paragraph | a blank line and the reference follow the paragraph, and a blank line follows the reference unless it ends the text |
| caret in the middle of a line | the line is split around a paragraph that holds only the reference |
| caret at the start of the text | no blank line before the reference |
| blank lines already there | they are reused, not doubled |
| the paragraph ends with a typed space, or spaces and tabs surround the caret | the spaces and tabs around the paste position go with the break, so no line keeps trailing blanks; line breaks are kept |
| caret directly at the end | the text before it is unchanged |

### Scenario (boundary): The selection and the positions
| Remembered selection | Outcome |
| --- | --- |
| a selection of two words | the selection is replaced by the paragraph and the file name inside the reference is selected |
| a position beyond the text | the positions are clamped to the length of the text |

### Related requirements
- SwRS-MDOKFSTUDIO-PALETTE-196: the host saves the image and chooses the name.
- SwRS-MDOKFSTUDIO-PALETTE-213: pasted rich text is converted by the host; pasting into a table cell stays native.

### Verification notes
- Method: test/page/runtimePaletteActions.test.ts (screenshot, saved insertion with the status line restored, text wins over an image and other items are ignored, an image over 10 MB is refused without a message to the host, a reply for another edit is ignored and a refusal shows its reason)
- Method: test/page/modules/paletteReq.requirements.test.ts (a pasted image that cannot be read shows The image could not be read. and posts nothing; a closed editor is left alone)
- Method: test/page/modules/pasteImage.test.ts (an image at the end of a text line, in the middle of a line, reused blank lines, trailing blanks dropped, a replaced selection, clamped positions)
- Method: visual scenario palette-slash/v22-pasted-image-paragraph-light-900 (paragraph of its own, trailing spaces dropped, file name selected)
- Method: untested, deduced from the code (pasteImage.ts, blockSourceEditor.ts): the refusal without a reason, the answer that reaches a closed or finishing editor and the autosave after the insertion
- Criteria: Items of other types, such as svg, leave the paste native; the insertion uses the selection of the moment of the paste; the status message is shown only while the same editor and text box are open and not finishing.
