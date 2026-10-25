---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-178
uuid: 2dfdd6e5-3c5e-4c22-9ea1-edecd54e8e5b
title: The host lists the label targets of the document
description: When the host answers previewListTargets, the extension SHALL list
  the lines (name)= of the current document text that are outside code fences
  and whose name starts with a letter or digit and holds only letters, digits,
  underscore, dot, colon and hyphen, in source order, each with the heading or
  first text line after it as detail clipped to 80 characters, at most 500
  entries, and set the truncated flag when the list is cut.
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-013
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-TRUST-090
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/mapping/mystTargets.ts
tested_in_files:
- test/core/mapping/mystTargets.test.ts
- test/integration/mystPickers.test.ts
---

## The host lists the label targets of the document

### Normative behavior

When the host answers previewListTargets, the extension SHALL list the lines (name)= of the current document text that are outside code fences and whose name starts with a letter or digit and holds only letters, digits, underscore, dot, colon and hyphen, in source order, each with the heading or first text line after it as detail clipped to 80 characters, at most 500 entries, and set the truncated flag when the list is cut.

### Scenario (nominal): Labels

- GIVEN a document with (intro)=, (plain-one)= and (a.b:c_d-1)=
- WHEN the host answers previewListTargets
- THEN the three names are listed in source order

### Scenario (refusal): Fences and bad names

- GIVEN labels inside a backtick or tilde fence, (bad name)= and (-bad)=
- WHEN the host answers
- THEN they are not listed

### Scenario (boundary): Detail of a label

| Input | Outcome |
| --- | --- |
| (intro)= followed by # Introduction | the detail is Introduction |
| a label followed by a paragraph line of 120 characters | the detail is 79 characters followed by an ellipsis |
| a label followed by other label lines and then a heading or a text line | the detail is that heading or line |
| a label followed by blanks inside the line | the blanks are collapsed in the detail |
| a label followed by nothing | no detail |
| a label line with blanks around it and nothing else | listed |
| a name of more than 100 characters (the label length limit of the rename feature) | not listed |

### Scenario (boundary): Size of the list

| Input | Outcome |
| --- | --- |
| 505 label lines | 500 entries and truncated true |
| one label line | one entry and truncated false |

### Scenario (nominal): Shape of the request and of the answer

- GIVEN a previewListTargets message with a non-empty editId of at most 100 characters
- WHEN the host answers for the current document
- THEN previewListTargetsResult repeats the editId and holds ok true, the items (value and label are the name, the detail is the heading or text) and the truncated flag; a message without a valid editId is ignored by the envelope check (see SwRS-MDOKFSTUDIO-TRUST-052), a stale or out-of-date request is answered or dropped by the gate (see SwRS-MDOKFSTUDIO-TRUST-065) and the answer is matched by its editId (see SwRS-MDOKFSTUDIO-TRUST-090)

### Related requirements

- SwRS-MDOKFSTUDIO-TRUST-065: the out-of-date answer The preview is out of date. Try again once it has refreshed. of a label request.

### Verification notes

- Method: test/core/mapping/mystTargets.test.ts (documentTargets lists (label)= names with the heading or text that follows; ignores labels in code fences and malformed names; caps the list and says so; checks the labels, fences and bad names, detail and size scenarios)
- Method: test/integration/mystPickers.test.ts (the labels first and second are listed with their detail; checks the labels scenario and the shape of the answer)
- Criteria: A label line may have blanks around it and nothing else; the popover shows More entries exist. Type to narrow the list. when the flag is set.
