---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-025
uuid: 54d6329d-fc2e-45c3-8b66-1655e581e30c
title: A resource reference resolves only to an existing file inside a root
description: When the extension resolves a resource reference of a page, it
  SHALL give the page the webview address of the file only if the reference is a
  relative path that decodes safely, names an existing regular file whose real
  path lies inside the folder of the document or the resource root of the
  preview, and otherwise refuse it with the code of the failed check and remove
  the attribute that held it.
project: markdown-okf-schema-studio
scope: trust-security
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TRUST-004
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/security/html-sanitizer.ts
- src/core/security/resource-policy.ts
tested_in_files:
- test/security/html-policy.test.ts
- test/security/resource-policy.test.ts
- test/security/trustReq.requirements.test.ts
---

## A resource reference resolves only to an existing file inside a root

### Normative behavior

When the extension resolves a resource reference of a page, it SHALL give the page the webview address of the file only if the reference is a relative path that decodes safely, names an existing regular file whose real path lies inside the folder of the document or the resource root of the preview, and otherwise refuse it with the code of the failed check and remove the attribute that held it.

### Scenario (nominal): Accepted references

| Input | Outcome |
| --- | --- |
| image.png, a file in a resource root | the real path of the file is returned |
| %61.png, with a file a.png in the root | the file is found (percent escapes are decoded) |
| sub/../image.png, with a file image.png in the root | the file is found (parent steps that stay inside the root) |
| a symbolic link in the root that points to a file in the root | the real path of the target is returned |
| image.png?v=1#preview | the file is found and the webview address ends with ?v=1#preview |
| a document in book/chapters, an image in book/external-img and the workspace folder as resource root | the image address is rewritten to a webview address (parent-relative figure image) |
| a file of a second, existing root, next to a root that is not on disk | the file is found |

### Scenario (refusal): Reference that is not a safe relative path

| Input | Outcome |
| --- | --- |
| data:text/plain,secret | refused with the code blocked-resource-scheme |
| javascript:alert(1) | refused with the code blocked-resource-scheme |
| vscode://file/secret | refused with the code blocked-resource-scheme |
| file:///tmp/secret | refused with the code blocked-resource-scheme |
| /etc/hosts | refused with the code blocked-resource-scheme |
| //host/share | refused with the code blocked-resource-scheme |
| %E0%A4%A (malformed escape) | refused with the code invalid-resource-path |
| a path with a backslash | refused with the code invalid-resource-path |
| %00 (NUL character) | refused with the code invalid-resource-path |
| an escape nested so deep that one remains after four decodings | refused with the code invalid-resource-path (percent escapes are decoded at most four times) |

### Scenario (refusal): Reference that leaves the roots or names no regular file

| Input | Outcome |
| --- | --- |
| ../outside/secret.txt, with secret.txt next to the root | refused with the code resource-outside-root |
| %2e%2e%2foutside%2fsecret.txt | refused with the code resource-outside-root (the decoded path leaves the root) |
| ../../../etc/hostname from a document in book/chapters | the src attribute is removed with the diagnostic blocked-resource |
| ghost.png, a file the root does not hold | refused with the code missing-resource, with the candidate path |
| sub, a folder of the root | refused with the code missing-resource (not a regular file) |
| a symbolic link in the root that points to a file outside it | refused with the code symlink-escape |

### Scenario (boundary): Query and fragment of a reference

| Input | Outcome |
| --- | --- |
| image.png?v=1#preview | the lookup ignores ?v=1#preview and the webview address of the file ends with ?v=1#preview, unchanged |
| image.png#a?b | the suffix is #a?b, the whole part from the first hash |

### Scenario (boundary): Roots of a page

- GIVEN a policy with a root that is not on disk and a second, existing root
- WHEN the policy is created
- THEN it drops the missing root, records the diagnostic missing-root with the root path (message The {label} resource root is unavailable) and resolves nothing through it, while a file of the second root is found
- GIVEN a page of a read-only preview
- WHEN a parent-relative figure image is resolved
- THEN it is refused, because both roots are the folder of the document

### Scenario (nominal): The src, poster and data attributes of a page

- GIVEN an image, a video with a poster and a source, all inside the roots
- WHEN the page is sanitized
- THEN each src, poster or data value becomes the webview address of its file
- GIVEN an image whose reference leaves the roots
- WHEN the page is sanitized
- THEN the src attribute is removed and the diagnostic blocked-resource is recorded

### Scenario (boundary): The srcset attribute of a page

| Input | Outcome |
| --- | --- |
| a srcset with a local image at 1x and a data: image at 2x | the srcset keeps the local image with 1x only, as a webview address |
| a srcset whose candidates are all refused | the attribute is removed and the diagnostic blocked-srcset is recorded |

### Related requirements

- SwRS-MDOKFSTUDIO-CORE-013: includes outside the allowed roots are refused
- SwRS-MDOKFSTUDIO-TOOLBAR-090: the same four-round decoding rule for the targets of links
- SwRS-MDOKFSTUDIO-MYST-031: figure images outside the document folder load

### Verification notes

- Method: Unit test test/security/resource-policy.test.ts (canonicalizes local resources and rejects hostile paths; resolves parent-relative figure references through an ancestor root; still blocks references escaping the workspace root; rewrites srcset candidates without allowing data or script URLs) covers the accepted references, the refusals for data:, javascript:, vscode:// and file://, the parent-step refusal in both spellings (%2e%2e%2f decodes to a parent path and is then refused by the root rule), the escaping symbolic link and the lookup that ignores the query and fragment. The absolute path and double-slash cases, the malformed, NUL, backslash and five-round cases, the symbolic link that stays inside, the appended suffix (resourceReferenceSuffix in src/session/webview.ts) and the blocked-srcset diagnostic are untested.
- Method: Unit test test/security/trustReq.requirements.test.ts (a resource must be an existing regular file; a resource root that does not exist is dropped with the diagnostic missing-root) covers the existing file, the missing file, the directory with its candidate path, the missing root and the second root.
- Method: Unit test test/security/html-policy.test.ts (resolves parent-relative figure images through the workspace root; strips figure images that escape even the workspace root; rewrites local resources and removes active HTML content) covers the parent-relative figure, the removed src with blocked-resource, the local image, video and poster rewrite and the mixed srcset.
- Criteria: Containment is tested on the resolved path with path.relative against each root; the real path of the file is returned. The refusal is recorded as a diagnostic of the policy. A Windows drive path with a forward slash starts with a scheme and is refused as blocked-resource-scheme; one with a backslash is refused as invalid-resource-path. createPreviewResourcePolicy builds two roots: the folder of the document and the resource root. The suffix is the text from the first query or fragment mark of the trimmed reference. No src, poster or data attribute keeps a value the policy refused, and the rewritten srcset holds only webview addresses.
