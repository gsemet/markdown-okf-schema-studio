---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-053
uuid: b9a58853-1d40-42cf-b480-f00939a63d35
title: A save VS Code rejects is reported
description: When VS Code rejects the workspace edit of a frontmatter save, the
  extension SHALL answer with "VS Code could not apply the frontmatter edit." or
  the error text.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-008
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-BLOCK-058; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-BLOCK-058
default_owner_email: gaetan@xeberon.net
---

## A save VS Code rejects is reported

### Normative behavior

When VS Code rejects the workspace edit of a frontmatter save, the extension SHALL answer with "VS Code could not apply the frontmatter edit." or the error text.

### Scenario: Nominal

- GIVEN a valid save for which VS Code does not apply the edit
- WHEN the host receives the result
- THEN the answer is "VS Code could not apply the frontmatter edit."

### Scenario: Boundary or refusal

- GIVEN an edit that throws an error
- WHEN the host catches it
- THEN the answer is the error message text

### Verification notes

- Method: Unit test a frontmatter save that VS Code does not apply is answered with a message; a thrown error gives its text in test/host/fmtableReq.requirements.test.ts.
- Criteria: Both answers leave the document unchanged and the editor open with the message.
