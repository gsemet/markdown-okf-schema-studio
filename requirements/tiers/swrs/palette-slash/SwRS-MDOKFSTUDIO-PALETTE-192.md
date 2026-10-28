---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-192
uuid: ae85ecc0-bc35-4ec4-8095-8eaaf6accc14
title: The host image picker answers a path relative to the document
description: When previewPickImage reaches the host for a trusted, saved
  document, the extension SHALL open a native dialog in the folder of the
  document filtered to png, jpg, jpeg, gif, webp and svg with the label Insert
  image, answer the picked file as a path relative to the document with forward
  slashes and blanks kept, or cancelled, or refuse a file that is outside every
  workspace folder, is not a local image or cannot be written in a reference
  with a reason the page shows, and read or write nothing.
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-007
- StRS-MDOKFSTUDIO-PALETTE-013
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-TRUST-090
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/session/features/hostRequests.ts
tested_in_files:
- test/core/mapping/imageReference.test.ts
- test/integration/imagePicker.test.ts
default_owner_email: gaetan@xeberon.net
---

## The host image picker answers a path relative to the document

### Normative behavior

When previewPickImage reaches the host for a trusted, saved document, the extension SHALL open a native dialog in the folder of the document filtered to png, jpg, jpeg, gif, webp and svg with the label Insert image, answer the picked file as a path relative to the document with forward slashes and blanks kept, or cancelled, or refuse a file that is outside every workspace folder, is not a local image or cannot be written in a reference with a reason the page shows, and read or write nothing.

### Scenario (nominal): Picked image

- GIVEN the document in a folder and the file my pics/a (1).png picked
- WHEN the host answers
- THEN the path is my pics/a (1).png, the dialog opened in the folder of the document with the filter Images, and the document is unchanged

### Scenario (refusal): Cancelled

- GIVEN the dialog cancelled
- WHEN the host answers
- THEN the answer is ok true with cancelled true

### Scenario (refusal): Refused picks

| Input | Outcome |
| --- | --- |
| a file outside every workspace folder | the reason reads The image must be inside a workspace folder. |
| a text file, or a file that is not local | the reason reads Pick a png, jpeg, gif, webp or svg image. |
| a file on another drive, with no relative path, or with a name that holds an angle bracket or a line break | the reason reads That image cannot be referenced from this document (another drive, or an unusual name). |
| a read-only preview | ok false with the read-only reason (SwRS-MDOKFSTUDIO-TRUST-005) |
| a document that is out of date or is not a file | ok false with the reason The preview is out of date, or the document is not a file. |
| a failed dialog | ok false with the message of the error (a value that is not an Error as its string) |

### Scenario (boundary): Shape of the request

| Input | Outcome |
| --- | --- |
| a previewPickImage message with a non-empty editId of at most 100 characters | handled; previewPickImageResult repeats the editId (see SwRS-MDOKFSTUDIO-TRUST-090) |
| a message without a valid editId | ignored by the envelope check (see SwRS-MDOKFSTUDIO-TRUST-052) |
| an SVG file | accepted for a reference (unlike a pasted image) |
| a path with Windows separators | accepted and written with forward slashes |

### Related requirements

- SwRS-MDOKFSTUDIO-PALETTE-150: the Figure button and Browse that use the answer.

### Verification notes

- Method: test/core/mapping/imageReference.test.ts (relativeImageReference gives a POSIX path relative to the document folder; accepts Windows separators and refuses another drive; refuses a path that cannot be written in a reference; isImageFileName accepts png, jpeg, gif, webp and svg only; checks the picked image, refused picks and shape scenarios)
- Method: test/integration/imagePicker.test.ts (the relative path, the dialog folder and filter, the cancel, that picking edits nothing, and that a file outside the workspace and a non-image are refused; checks the picked image, cancelled and refused picks scenarios)
- Criteria: The read-only, out-of-date and failed-dialog answers are deduced from the code (handlePickImage), not tested.
