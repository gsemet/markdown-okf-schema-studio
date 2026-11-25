---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-002
uuid: 16e75dfb-3bcc-404e-9ced-54b954339956
title: 'A preview with restricted reads reads includes and resources from the folder
  of its document only, and no home folder or dot-directory'
description: 'When a preview has restricted reads (no workspace folder, or Restricted
  Mode; editing is not affected), the extension SHALL refuse every include and resource
  whose path lies below a dot-segment, and SHALL read includes and resources other
  than images from the folder of the document only, and none of them when that folder
  is the home folder of the user, a folder that contains it or a file-system root,
  showing the reason as a diagnostic.'
project: markdown-okf-schema-studio
scope: trust-security
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TRUST-004
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-025
scenarios:
- id: S1
  title: Preview with restricted reads in an ordinary folder
- id: S2
  title: Non-image resource and include outside the document folder
- id: S3
  title: Dot-directory
- id: S4
  title: Broad folder
- id: S5
  title: Trusted workspace
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/security/resource-policy.ts
- src/session/features/rendering.ts
- src/session/webview.ts
tested_in_files:
- test/security/readOnlyRoot.requirements.test.ts
- test/session/baselineDiff.test.ts
- test/session/readOnlyImages.test.ts
- test/session/readOnlyImagesSession.test.ts
- test/session/readOnlyLocalRoots.test.ts
- test/visual/readOnlyImagesScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## A preview with restricted reads reads includes and resources from the folder of its document only, and no home folder or dot-directory

### Normative behavior

When a preview has restricted reads (no workspace folder, or Restricted Mode; editing is not affected), the extension SHALL refuse every include and resource whose path lies below a dot-segment, and SHALL read includes and resources other than images from the folder of the document only, and none of them when that folder is the home folder of the user, a folder that contains it or a file-system root, showing the reason as a diagnostic. The images of such a preview are SwRS-MDOKFSTUDIO-TRUST-091.

### Scenario S1 (nominal): Preview with restricted reads in an ordinary folder

- GIVEN a preview with restricted reads of a document in a folder that is not the home folder
- WHEN the document includes a file next to it, or loads an image next to it
- THEN the include and the image are served as before

### Scenario S2 (refusal): Non-image resource and include outside the document folder

- GIVEN the same preview with restricted reads
- WHEN a file that is not an image, or an include, lies in the workspace folder outside the folder of the document
- THEN it is refused with the code resource-outside-root, as before

### Scenario S3 (refusal): Dot-directory

- GIVEN a preview with restricted reads in any folder
- WHEN an include or a resource names a path with a segment that starts with a dot below the folder of the document (.ssh/id_rsa, .agents/rule.md), or a symbolic link that leads to such a path
- THEN it is refused with the code hidden-path and the diagnostic "A preview with restricted reads does not read paths inside dot-directories such as .ssh or .config."

### Scenario S4 (refusal): Broad folder

- GIVEN a preview with restricted reads whose document is in the home folder, in a folder that contains it (such as /Users) or in a file-system or drive root
- WHEN an include or a resource that is not an image is requested, even a plain file next to the document
- THEN it is refused with the code restricted-root and the diagnostic that names the home folder

### Scenario S5 (boundary): Trusted workspace

- GIVEN a preview of a trusted workspace folder
- WHEN a document includes a file inside a dot-directory such as .agents
- THEN the file is included (the dot-segment rule applies to previews with restricted reads only)

### Related requirements

- SwRS-MDOKFSTUDIO-TRUST-025: a resource resolves only to an existing file inside a root (the allowed-roots rule, written once there)
- SwRS-MDOKFSTUDIO-TRUST-091: the images of a preview with restricted reads
- SwRS-MDOKFSTUDIO-CORE-013: includes outside the allowed roots are refused

### Verification notes

- Method: Unit tests test/session/readOnlyImages.test.ts (includes and non-image files still refused; the policy is asked directly for the non-image gate). Unit test test/security/readOnlyRoot.requirements.test.ts covers the broad roots, the policy refusals with their codes, the symbolic link into a dot-directory, the render of includes with diagnostics and the unchanged trusted behaviour.
- Criteria: The home folder is read from USERPROFILE (HOME first outside Windows), then HOMEDRIVE+HOMEPATH, after realpath, compared case-insensitively on Windows and macOS (the core layer cannot import node:os); a folder is broad when it equals or contains it, or is a file-system root. The dot-segment test runs on the path relative to the root, before and after resolving symbolic links.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TRUST-004](../../strs/trust-security/StRS-MDOKFSTUDIO-TRUST-004.md): Local files load only from the allowed folders
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-025](SwRS-MDOKFSTUDIO-TRUST-025.md): A resource reference resolves only to an existing file inside a root
<!-- okf:links:end -->
