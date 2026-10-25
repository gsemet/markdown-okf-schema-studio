---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-196
uuid: ac1416ec-9dca-4037-8cb3-99cd0fc606ec
title: The host saves a pasted image next to the document under a name it
  chooses
description: When previewPasteImage is accepted, the extension SHALL check the
  request and the image bytes, save the image in the folder of the document as
  image.png, image.jpg, image.gif or image.webp, or with the suffix -1, -2 and
  so on up to -1000 when the name is taken, comparing names without case, never
  showing the name before all its bytes are written, and answer the file name,
  or write nothing and answer a refusal with its reason when a check or the
  write fails.
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-018
- StRS-MDOKFSTUDIO-PALETTE-013
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-090
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/mapping/pastedImage.ts
- src/session/features/hostRequests.ts
tested_in_files:
- test/core/mapping/pastedImage.test.ts
- test/core/protocol/pageToHost.test.ts
- test/integration/imagePaste.test.ts
- test/session/paletteReq.requirements.test.ts
- test/session/pasteImageWrite.test.ts
---

## The host saves a pasted image next to the document under a name it chooses

### Normative behavior

When previewPasteImage is accepted, the extension SHALL check the request and the image bytes, save the image in the folder of the document as image.png, image.jpg, image.gif or image.webp, or with the suffix -1, -2 and so on up to -1000 when the name is taken, comparing names without case, never showing the name before all its bytes are written, and answer the file name, or write nothing and answer a refusal with its reason when a check or the write fails.

### Scenario (nominal): The host chooses the name
The name never comes from the page. The handler answers ok true and the file name (previewPasteImageResult). The envelope, the render gate, the read-only refusal and the answer correlation are those of SwRS-MDOKFSTUDIO-TRUST-052, SwRS-MDOKFSTUDIO-TRUST-065, SwRS-MDOKFSTUDIO-TRUST-005 and SwRS-MDOKFSTUDIO-TRUST-090.

| GIVEN the folder of the document | WHEN the bytes are | THEN the file and the answer are |
| --- | --- | --- |
| empty | a png | image.png |
| empty | a jpeg | image.jpg |
| empty | a gif | image.gif |
| empty | a webp | image.webp |
| holds image.png | a png | image-1.png |
| holds image.png and image-1.png | a png | image-2.png |
| holds a name that differs from image.png only by case | a png | image-1.png (the name counts as taken) |

### Scenario (nominal): The name appears complete
- GIVEN a reader that looks at the folder during the write
- WHEN the image is being saved
- THEN the bytes go to a hidden partial file of the same folder (named dot, the file name, a random suffix and .partial) that is renamed to the chosen name without overwriting, so the chosen name is never seen empty or partial
- GIVEN a file created under the chosen name during the write
- WHEN the rename runs
- THEN that file is kept and not overwritten

### Scenario (boundary): The numbering stops after 1000 suffixes
| Folder | Outcome |
| --- | --- |
| image-1000.png free, all smaller names taken | the file is written under image-1000.png |
| image.png and image-1.png to image-1000.png taken (1001 taken names) | ok false with the reason Too many pasted images next to this document. and nothing is written |

### Scenario (refusal): A check fails
Each refusal answers ok false with the reason below and writes nothing; the folder is unchanged. The checks run in this order.

| Case | Reason |
| --- | --- |
| read-only preview | Pasting an image needs a trusted workspace. |
| document with no file path, or whose id differs from the previewed document | Save the document before pasting an image. |
| saved document whose file is not a .md file (any case of the extension) | Pasting an image needs a Markdown file. |
| document folder outside every workspace folder, both paths compared with symbolic links resolved | The image must be saved inside a workspace folder. |
| announced type outside png, jpeg, gif and webp, or data that is not plain base64 | That clipboard image type is not supported. |
| more than 10 MiB (10 times 1024 times 1024 bytes) of bytes | The image is larger than 10 MB. |
| first bytes that are not those of the announced type (text announced as image/png) | The clipboard data is not a png, jpeg, gif or webp image. |
| no free name up to the suffix 1000 | Too many pasted images next to this document. |

A saved .md document in a folder inside the workspace, reached through a symbolic link or not, is accepted and the image is saved. This handler does not check the render revision.

### Scenario (refusal): The write fails
- GIVEN a write that fails
- WHEN the save ends
- THEN no file, empty or partial, is left under the chosen name or the partial name, the partial file is deleted in every failing case, and the answer is ok false with the message of the error as the reason
- GIVEN a write that succeeds
- WHEN the save ends
- THEN only the chosen name remains

### Scenario (boundary): The message shape
| previewPasteImage field | Accepted | Otherwise |
| --- | --- | --- |
| mime | image/png, image/jpeg, image/gif or image/webp (SVG is not accepted because it can carry script) | the protocol rejects the message and the handler does not run |
| dataBase64 | a non-empty string of at most 14,000,000 characters in the base64 alphabet with optional padding and no whitespace | the protocol rejects the message and the handler does not run |
| edit id | as for every host request (SwRS-MDOKFSTUDIO-TRUST-052) | the protocol rejects the message |

### Related requirements
- SwRS-MDOKFSTUDIO-PALETTE-203: the page reads the clipboard image and posts this message.

### Verification notes
- Method: test/core/mapping/pastedImage.test.ts (name table and numbering of the nominal scenario, the 1000-suffix boundary, the sniffing of png, jpeg, gif and webp, the refusal of SVG, text and short input, a spoofed type, the base64 alphabet)
- Method: test/integration/imagePaste.test.ts (image.png then image-1.png and the files in the folder; a spoofed type and a non-image are refused and the folder is unchanged)
- Method: test/session/pasteImageWrite.test.ts (a name complete at all times, a file created under the chosen name during the write is kept, a failed write leaves no file and the page gets the reason)
- Method: test/session/paletteReq.requirements.test.ts (refusal rows for an unsaved or other document, a folder outside the workspace with links resolved and inside it accepted, a non-Markdown file and a .md file accepted)
- Method: test/core/protocol/pageToHost.test.ts (message shape: the size bound, plain base64 of an allowed type)
- Criteria: The name never comes from the page; a name that differs only by case counts as taken; the partial file has a hidden name of the form dot, the file name, a random suffix and .partial; the validator bounds the base64 text to 14,000,000 characters and the host refuses more than 10 MiB of bytes; both folder paths are compared after resolving symbolic links; eligibility needs a file path ending in .md in any case.
