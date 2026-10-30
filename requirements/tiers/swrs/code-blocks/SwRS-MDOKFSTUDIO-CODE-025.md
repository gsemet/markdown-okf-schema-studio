---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-025
uuid: a67671ff-fd6a-4c4b-9020-40d44e7f6434
title: Allow copying in read-only previews
description: When a preview is read-only because the workspace is untrusted or
  the file is standalone, the extension SHALL still write the requested code
  text to the clipboard and edit nothing.
project: markdown-okf-schema-studio
scope: code-blocks
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-004
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-TRUST-006; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-TRUST-006
default_owner_email: gaetan@xeberon.net
---

## Allow copying in read-only previews

### Normative behavior

When a preview is read-only because the workspace is untrusted or the file is standalone, the extension SHALL still write the requested code text to the clipboard and edit nothing.

### Scenario: nominal behavior

- GIVEN an untrusted workspace preview
- WHEN the reader clicks Copy code
- THEN the code is on the clipboard and the document is unchanged

### Scenario: boundary or refusal behavior

- GIVEN a standalone file preview
- WHEN the reader clicks Copy code
- THEN the code is on the clipboard and no edit request is processed

### Verification notes

- Method: Integration test in the untrusted and standalone suites.
- Criteria: Clipboard written; no document edit.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CODE-004](../../strs/code-blocks/StRS-MDOKFSTUDIO-CODE-004.md): A reader copies the exact code of a block
- Superseded by:
  - [SwRS-MDOKFSTUDIO-TRUST-006](../trust-security/SwRS-MDOKFSTUDIO-TRUST-006.md): A read-only preview keeps every viewing action
<!-- okf:links:end -->
