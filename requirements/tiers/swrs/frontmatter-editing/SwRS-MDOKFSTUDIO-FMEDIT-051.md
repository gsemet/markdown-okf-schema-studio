---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-051
uuid: b152cca7-c62f-44de-8d70-f5a76c32ba08
title: A save in an untrusted workspace is refused
description: When the preview is read-only because the workspace is untrusted or
  the file is outside the workspace, the extension SHALL refuse a frontmatter
  save with the read-only reason (SwRS-MDOKFSTUDIO-TRUST-005)
project: markdown-okf-schema-studio
scope: frontmatter-editing
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-008
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-TRUST-005; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-TRUST-005
default_owner_email: gaetan@xeberon.net
---

## A save in an untrusted workspace is refused

### Normative behavior

When the preview is read-only because the workspace is untrusted or the file is outside the workspace, the extension SHALL refuse a frontmatter save with the read-only reason (SwRS-MDOKFSTUDIO-TRUST-005)

### Scenario: Nominal

- GIVEN a read-only preview
- WHEN a previewFrontmatterSave arrives
- THEN the page receives the error the read-only reason (SwRS-MDOKFSTUDIO-TRUST-005) and the document is unchanged

### Scenario: Boundary or refusal

- GIVEN a trusted workspace and a file inside it
- WHEN the same save arrives
- THEN it is processed normally

### Verification notes

- Method: Unit test a frontmatter save in an untrusted workspace is refused with the trust message and changes nothing in test/host/fmtableReq.requirements.test.ts. Untested: the file outside the workspace (standalone) branch.
- Criteria: Standalone files get the same wording.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMEDIT-008](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-008.md): Metadata edits keep the source intact, follow the schema and never lose text
- Superseded by:
  - [SwRS-MDOKFSTUDIO-TRUST-005](../trust-security/SwRS-MDOKFSTUDIO-TRUST-005.md): The host refuses every write request of a read-only preview with a reason
<!-- okf:links:end -->
