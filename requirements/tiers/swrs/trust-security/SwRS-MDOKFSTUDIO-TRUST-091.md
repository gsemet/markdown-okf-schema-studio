---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-091
uuid: ddcd6ea7-ef78-40d1-b4fe-6301d4f1508e
title: A restricted-reads preview shows the images of its folders
description: When a preview with restricted reads shows an image file, the
  extension SHALL load it from the folder of the document, and from the
  workspace folder unless that folder is broad, granting the webview those
  folders as local resource roots.
project: markdown-okf-schema-studio
scope: trust-security
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TRUST-004
scenarios:
- id: S1
  title: Images of the document folder and of the workspace folder
- id: S2
  title: Images in a broad folder
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/security/resource-policy.ts
tested_in_files:
- test/session/baselineDiff.test.ts
- test/session/readOnlyImages.test.ts
- test/session/readOnlyImagesSession.test.ts
- test/session/readOnlyLocalRoots.test.ts
- test/visual/readOnlyImagesScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## A restricted-reads preview shows the images of its folders

### Normative behavior

When a preview with restricted reads shows an image (a file named .png, .jpg, .jpeg, .gif, .webp or .svg, whatever element loads it, and leading to a file of those kinds), the extension SHALL load it from the folder of the document, even when that folder is broad, and from the workspace folder unless that is broad, never from below a dot-segment, and SHALL grant the webview those folders as local resource roots.

### Scenario S1 (nominal): Images of the document folder and of the workspace folder

- GIVEN a preview with restricted reads of a document in a subfolder of a workspace folder that is not broad, whose images have spaces in their names (written with %20 or between angle brackets), lie in a subfolder of the document folder, or lie in the workspace folder outside the document folder
- WHEN the document shows them as images (png, jpg, jpeg, gif, webp or svg)
- THEN every image loads, and the webview has the folder of the document and the workspace folder as local resource roots

### Scenario S2 (boundary): Images in a broad folder

- GIVEN a preview with restricted reads whose document is in the home folder (or in a folder that contains it, or in a file-system root), and a workspace folder that may be the home folder too
- WHEN the document shows an image next to it or below its folder, and an image of the workspace folder outside the document folder
- THEN the image of the document folder (never one below a dot-segment) loads and the folder of the document is a local resource root; the image of the broad workspace folder is refused with the code restricted-root, and that folder is no local resource root

### Related requirements

- SwRS-MDOKFSTUDIO-TRUST-002: the includes and the other resources of a preview with restricted reads, and the dot-directory and broad-folder refusals
- SwRS-MDOKFSTUDIO-TRUST-025: a resource resolves only to an existing file inside a root

### Verification notes

- Method: Unit tests test/session/readOnlyImages.test.ts and test/session/readOnlyImagesSession.test.ts (images with spaces, in a subfolder, in the home folder, in the workspace folder; a .png link to another kind of file refused; the session wiring: an image of the workspace folder outside the document folder, and its folder as webview root); the visual scenario trust-security/v04-read-only-images-light-900 shows the images in the rendered page.
- Method: Unit test test/session/baselineDiff.test.ts (the same image of the workspace folder in the HEAD text of the side-by-side diff) and test/session/readOnlyLocalRoots.test.ts (the webview resource roots, previewLocalResourceRoots in src/session/features/rendering.ts).
- Criteria: The image rule is the `image` option of resolveResource in src/core/security/resource-policy.ts, set for every page resource by buildPreviewWebviewHtml, matched on the decoded extension (the limit is by file extension, not by element) and again on the real path after symbolic links. A broad workspace folder is refused with the code restricted-root and is no local resource root.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TRUST-004](../../strs/trust-security/StRS-MDOKFSTUDIO-TRUST-004.md): Local files load only from the allowed folders
<!-- okf:links:end -->
