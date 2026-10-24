---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-050
uuid: 06b0e883-3e72-435c-9a86-b5aab95c2829
title: Document-relative links resolve from the document's folder
description: When a link annotation has the resolution `document-relative`, the
  extension SHALL resolve the target from the folder of the document and accept
  it only when it names an existing file inside a workspace folder, unless
  `allowOutsideWorkspaceLinks` is true.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-015
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Document-relative links resolve from the document's folder

### Normative behavior

When a link annotation has the resolution `document-relative`, the extension SHALL resolve the target from the folder of the document and accept it only when it names an existing file inside a workspace folder, unless `allowOutsideWorkspaceLinks` is true.

### Scenario: Sibling file

- GIVEN a document-relative link t.md and t.md in the document's folder
- WHEN the document is analysed
- THEN the link is valid

### Scenario: Missing file

- GIVEN a document-relative link nope.md that does not exist
- WHEN the document is analysed
- THEN the field carries [E10] target 'nope.md' does not resolve to a file at 'ref' and the label reads File not found

### Verification notes

- Method: Unit test of the link resolver.
- Criteria: Containment is checked on the path and again on the real path (symlinks); without a workspace folder the navigation root is the document's folder.
