---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-002
uuid: 16e75dfb-3bcc-404e-9ced-54b954339956
title: A read-only preview reads no home folder and no dot-directory
description: When a preview is read-only (no workspace folder, or Restricted
  Mode), the extension SHALL refuse every include and resource whose path lies
  below a dot-segment, and SHALL refuse every include and resource, and grant
  the webview no local resource root, when the folder of the document is the
  home folder of the user, a folder that contains it or a file-system root,
  showing the reason as a diagnostic.
project: markdown-okf-schema-studio
scope: trust-security
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TRUST-004
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/security/resource-policy.ts
- src/session/features/rendering.ts
tested_in_files:
- test/security/readOnlyRoot.requirements.test.ts
- test/session/readOnlyLocalRoots.test.ts
default_owner_email: gaetan@xeberon.net
---

## A read-only preview reads no home folder and no dot-directory

### Normative behavior

When a preview is read-only (no workspace folder, or Restricted Mode), the extension SHALL refuse every include and resource whose path lies below a dot-segment, and SHALL refuse every include and resource, and grant the webview no local resource root, when the folder of the document is the home folder of the user, a folder that contains it or a file-system root, showing the reason as a diagnostic.

### Scenario (nominal): Read-only preview in an ordinary folder

- GIVEN a read-only preview of a document in a folder that is not the home folder
- WHEN the document includes a file next to it, or loads an image next to it
- THEN the include and the image are served as before

### Scenario (refusal): Dot-directory

- GIVEN a read-only preview in any folder
- WHEN an include or a resource names a path with a segment that starts with a dot below the folder of the document (.ssh/id_rsa, .agents/rule.md), or a symbolic link that leads to such a path
- THEN it is refused with the code hidden-path and the diagnostic "A read-only preview does not read paths inside dot-directories such as .ssh or .config."

### Scenario (refusal): Broad folder

- GIVEN a read-only preview whose document is in the home folder, in a folder that contains it (such as /Users) or in a file-system or drive root
- WHEN an include or a resource is requested, even a plain file next to the document
- THEN it is refused with the code restricted-root and the diagnostic that names the home folder, and the webview gets no local resource root except the extension bundle

### Scenario (boundary): Trusted workspace

- GIVEN a preview of a trusted workspace folder
- WHEN a document includes a file inside a dot-directory such as .agents
- THEN the file is included (the dot-segment rule applies to read-only previews only)

### Related requirements

- SwRS-MDOKFSTUDIO-TRUST-025: a resource resolves only to an existing file inside a root
- SwRS-MDOKFSTUDIO-CORE-013: includes outside the allowed roots are refused

### Verification notes

- Method: Unit test test/security/readOnlyRoot.requirements.test.ts covers the broad roots, the policy refusals with their codes, the symbolic link into a dot-directory, the render of includes with diagnostics and the unchanged trusted behaviour.
- Criteria: The home folder is read from USERPROFILE (HOME first outside Windows), then HOMEDRIVE+HOMEPATH, after realpath, compared case-insensitively on Windows and macOS (the core layer cannot import node:os); a folder is broad when it equals or contains it, or is a file-system root. The dot-segment test runs on the path relative to the root, before and after resolving symbolic links. The webview resource roots (previewLocalResourceRoots in src/session/features/rendering.ts) are covered by test/session/readOnlyLocalRoots.test.ts.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TRUST-004](../../strs/trust-security/StRS-MDOKFSTUDIO-TRUST-004.md): Local files load only from the allowed folders
<!-- okf:links:end -->
