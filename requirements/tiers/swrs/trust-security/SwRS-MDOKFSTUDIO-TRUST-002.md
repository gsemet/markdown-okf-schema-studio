---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-002
uuid: 16e75dfb-3bcc-404e-9ced-54b954339956
title: A preview with restricted reads reads no include, shows images only, and
  reads no home folder or dot-directory
description: "When a preview has restricted reads (no workspace folder, or Restricted
  Mode; editing is not affected), the extension SHALL refuse every include and resource
  whose path lies below a dot-segment; SHALL read includes and resources other than
  images from the folder of the document only, and none of them when that folder is
  the home folder of the user, a folder that contains it or a file-system root, showing
  the reason as a diagnostic; and SHALL show images (files named .png, .jpg, .jpeg,
  .gif, .webp or .svg, whatever element loads them, and leading to a file of those
  kinds) from the folder of the document, even when it is broad, and from the workspace
  folder unless that is broad, granting the webview those folders as local resource
  roots."
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

## A preview with restricted reads reads no include, shows images only, and reads no home folder or dot-directory

### Normative behavior

When a preview has restricted reads (no workspace folder, or Restricted Mode; editing is not affected), the extension SHALL refuse every include and resource whose path lies below a dot-segment; SHALL read includes and resources other than images from the folder of the document only, and none of them when that folder is the home folder of the user, a folder that contains it or a file-system root, showing the reason as a diagnostic; and SHALL show images (files named .png, .jpg, .jpeg, .gif, .webp or .svg, whatever element loads them, and leading to a file of those kinds) from the folder of the document, even when it is broad, and from the workspace folder unless that is broad, granting the webview those folders as local resource roots.

### Scenario (nominal): Preview with restricted reads in an ordinary folder

- GIVEN a preview with restricted reads of a document in a folder that is not the home folder
- WHEN the document includes a file next to it, or loads an image next to it
- THEN the include and the image are served as before

### Scenario (nominal): Images of the document folder and of the workspace folder

- GIVEN a preview with restricted reads of a document in a subfolder of a workspace folder that is not broad, whose images have spaces in their names (written with %20 or between angle brackets), lie in a subfolder of the document folder, or lie in the workspace folder outside the document folder
- WHEN the document shows them as images (png, jpg, jpeg, gif, webp or svg)
- THEN every image loads, and the webview has the folder of the document and the workspace folder as local resource roots

### Scenario (refusal): Non-image resource and include outside the document folder

- GIVEN the same preview with restricted reads
- WHEN a file that is not an image, or an include, lies in the workspace folder outside the folder of the document
- THEN it is refused with the code resource-outside-root, as before

### Scenario (refusal): Dot-directory

- GIVEN a preview with restricted reads in any folder
- WHEN an include or a resource names a path with a segment that starts with a dot below the folder of the document (.ssh/id_rsa, .agents/rule.md), or a symbolic link that leads to such a path
- THEN it is refused with the code hidden-path and the diagnostic "A preview with restricted reads does not read paths inside dot-directories such as .ssh or .config."

### Scenario (refusal): Broad folder

- GIVEN a preview with restricted reads whose document is in the home folder, in a folder that contains it (such as /Users) or in a file-system or drive root
- WHEN an include or a resource that is not an image is requested, even a plain file next to the document
- THEN it is refused with the code restricted-root and the diagnostic that names the home folder

### Scenario (boundary): Images in a broad folder

- GIVEN a preview with restricted reads whose document is in the home folder (or in a folder that contains it, or in a file-system root), and a workspace folder that may be the home folder too
- WHEN the document shows an image next to it or below its folder, and an image of the workspace folder outside the document folder
- THEN the image of the document folder (never one below a dot-segment) loads and the folder of the document is a local resource root; the image of the broad workspace folder is refused with the code restricted-root, and that folder is no local resource root

### Scenario (boundary): Trusted workspace

- GIVEN a preview of a trusted workspace folder
- WHEN a document includes a file inside a dot-directory such as .agents
- THEN the file is included (the dot-segment rule applies to previews with restricted reads only)

### Related requirements

- SwRS-MDOKFSTUDIO-TRUST-025: a resource resolves only to an existing file inside a root
- SwRS-MDOKFSTUDIO-CORE-013: includes outside the allowed roots are refused

### Verification notes

- Method: Unit tests test/session/readOnlyImages.test.ts and test/session/readOnlyImagesSession.test.ts (the session wiring: an image of the workspace folder outside the document folder, and its folder as webview root) cover the policy for images (images with spaces, in a subfolder, in the home folder, in the workspace folder; includes and non-image files still refused, a .png link to another kind of file refused; the policy is asked directly for the non-image gate); the visual scenario trust-security/v04-read-only-images-light-900 shows the images in the rendered page. Unit test test/session/baselineDiff.test.ts covers the same image of the workspace folder in the HEAD text of the side-by-side diff. Unit test test/security/readOnlyRoot.requirements.test.ts covers the broad roots, the policy refusals with their codes, the symbolic link into a dot-directory, the render of includes with diagnostics and the unchanged trusted behaviour.
- Criteria: The home folder is read from USERPROFILE (HOME first outside Windows), then HOMEDRIVE+HOMEPATH, after realpath, compared case-insensitively on Windows and macOS (the core layer cannot import node:os); a folder is broad when it equals or contains it, or is a file-system root. The dot-segment test runs on the path relative to the root, before and after resolving symbolic links. The image rule is the `image` option of resolveResource in src/core/security/resource-policy.ts, set for every page resource by buildPreviewWebviewHtml, matched on the decoded extension (the limit is by file extension, not by element) and again on the real path after symbolic links. The webview resource roots (previewLocalResourceRoots in src/session/features/rendering.ts) are covered by test/session/readOnlyLocalRoots.test.ts.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TRUST-004](../../strs/trust-security/StRS-MDOKFSTUDIO-TRUST-004.md): Local files load only from the allowed folders
<!-- okf:links:end -->
