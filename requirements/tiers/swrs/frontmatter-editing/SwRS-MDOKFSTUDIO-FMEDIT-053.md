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
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-009
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
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

- Method: Inspection of FrontmatterController.handleSave (src/session/features/frontmatter.ts).
- Criteria: Both answers leave the document unchanged and the editor open with the message.
