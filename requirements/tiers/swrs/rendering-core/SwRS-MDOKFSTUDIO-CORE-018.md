---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-018
uuid: 4d74c790-a832-4931-8c3f-9e157953a2f4
title: Refuse includes outside the allowed roots
description: When an include points outside the allowed roots, uses an absolute
  path or a URL scheme, has an undecodable path or a symlink that escapes its
  root, the extension SHALL list a warning naming the request and not read the
  file.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-002
- StRS-MDOKFSTUDIO-CORE-003
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CORE-013; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-CORE-013
default_owner_email: gaetan@xeberon.net
---

## Refuse includes outside the allowed roots

### Normative behavior

When an include points outside the allowed roots, uses an absolute path or a URL scheme, has an undecodable path or a symlink that escapes its root, the extension SHALL list a warning naming the request and not read the file.

### Scenario: Nominal refuse includes outside the allowed roots

- GIVEN an include of `../../secret.md` outside the roots
- WHEN it is rendered
- THEN the file is not read and a warning with its value is listed

### Scenario: Boundary or refusal of refuse includes outside the allowed roots

- GIVEN an include with an `https:` URL
- WHEN it is rendered
- THEN the URL is not fetched and a warning is listed

### Verification notes

- Method: Unit test "canonicalizes local resources and rejects hostile paths" in test/security/resource-policy.test.ts
- Criteria: Each refusal code lists a warning item and reads no file.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-002](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-002.md): A writer composes a document from included files
  - [StRS-MDOKFSTUDIO-CORE-003](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-003.md): A reader sees what cannot be rendered and keeps a usable preview
- Superseded by:
  - [SwRS-MDOKFSTUDIO-CORE-013](SwRS-MDOKFSTUDIO-CORE-013.md): Includes are bounded by depth, budget, size and allowed roots
<!-- okf:links:end -->
