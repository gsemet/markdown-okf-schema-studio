---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-007
uuid: 8d5311bd-1111-40d3-bc26-c0258df4dc66
title: A page loads local files only from its resource roots
description: When the extension shows a document, it SHALL allow the webview to
  load local files only from the resource root of the preview (the folder of the
  document for a read-only preview, the workspace folder that holds the document
  for a writable one) and from the bundle folder of the extension, and no local
  file for the pending page that clears the content and for the missing-source
  page.
project: markdown-okf-schema-studio
scope: trust-security
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TRUST-004
- StRS-MDOKFSTUDIO-TRUST-006
- StRS-MDOKFSTUDIO-TOOLBAR-011
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/renderPipeline.ts
- src/host-vscode/activation.ts
- src/host-vscode/previewPanel.ts
- src/session/features/links.ts
- src/session/features/rendering.ts
- src/session/previewManager.ts
- src/session/webview.ts
tested_in_files:
- test/integration/standalone-suite.ts
- test/security/trustReq.requirements.test.ts
- test/session/previewRuntimeFile.test.ts
- test/session/toolbarReq.requirements.test.ts
- test/session/trustReq.requirements.test.ts
---

## A page loads local files only from its resource roots

### Normative behavior

When the extension shows a document, it SHALL allow the webview to load local files only from the resource root of the preview (the folder of the document for a read-only preview, the workspace folder that holds the document for a writable one) and from the bundle folder of the extension, and no local file for the pending page that clears the content and for the missing-source page.

### Scenario (nominal): Read-only preview of a file outside the workspace
- GIVEN a Markdown file outside every workspace folder, with an image beside it
- WHEN the reader previews it
- THEN the resource root is the folder of the file and the image beside it loads

### Scenario (nominal): Read-only preview in an untrusted workspace
- GIVEN a document in a subfolder of an untrusted workspace folder
- WHEN the reader previews it
- THEN the resource root is that subfolder, not the workspace folder

### Scenario (nominal): Writable preview
| Input | Outcome |
| --- | --- |
| A trusted workspace and a document in a subfolder of its folder | The resource root is the workspace folder |
| A trusted window with two workspace folders and a document in the second | The resource root is the second folder |

### Scenario (nominal): Roots the webview may load from
- GIVEN a writable preview of a workspace document, or a read-only preview of a file outside the workspace
- WHEN the page is shown
- THEN the webview may load from the workspace folder (writable) or the folder of the file (read-only), and from the bundle folder, and from nowhere else; a read-only preview may not load from the workspace or the rest of the disk

### Scenario (nominal): Runtime and stylesheet as bundle files
| Input | Outcome |
| --- | --- |
| A rendered page, its HTML read | It holds a script element with the bundle URL of preview.js and the attribute data-sphinx-preview-scroll-sync, and the page's style imports preview.css |
| Two renders of one document type, their pages built | Only the JSON element of the context differs, so the shell keys are equal |

### Scenario (refusal): New panel and status pages allow no local file
| Input | Outcome |
| --- | --- |
| A panel just created for a preview, no document rendered yet | Its webview has no local resource root |
| A preview whose source file was deleted, the page replaced by the missing-source page | The webview has no local resource root until a document is rendered again |
| The page replaced by the pending page that clears the content | The webview has no local resource root |

### Scenario (boundary): Links and includes of a read-only preview stay in the folder of the document
| Input | Outcome |
| --- | --- |
| A standalone preview and a link to a file below the document's folder | It opens |
| The same preview and a link to ../other.md | It is blocked with outside the standalone document directory |
| A read-only preview and an include of sub/part.md next to the document | The file is included |
| The same preview and an include of ../other.md | The file is refused as outside the roots |

### Known issues
- Known issue: with a packaged VSIX, VS Code disables the extension in Restricted Mode unless a user setting or the product configuration overrides it (SwRS-MDOKFSTUDIO-TRUST-001); the Restricted Mode case of this requirement is then reached only with that override. Deduced from the VS Code source, not run with a packaged build.
- Known issue: the text of SwRS-MDOKFSTUDIO-CORE-012 says an include is expanded for a trusted document, and docs/known-limitations.md says that file includes are supported only when the workspace is trusted; the code reads includes in Restricted Mode and for a file outside the workspace too, from the folder of the document.

### Related requirements
- SwRS-MDOKFSTUDIO-FMSCHEMA-019: the schema is not searched in a read-only preview
- SwRS-MDOKFSTUDIO-CORE-012: an include is expanded in place
- SwRS-MDOKFSTUDIO-CORE-013: includes outside the allowed roots are refused

### Verification notes
- Method: test/integration/standalone-suite.ts checks the Read-only preview of a file outside the workspace (the render output directory equals the folder of the file) and the roots of the Roots the webview may load from scenario (the local resource roots contain the workspace folder when writable, the folder of the file when read-only; the bundle folder entry is not asserted). The Restricted Mode, subfolder and multi-root cases of the writable and untrusted scenarios are untested; the Restricted Mode case is read from createSession in src/session/previewManager.ts.
- Method: test/session/previewRuntimeFile.test.ts (PERF-11: a rendered page loads the runtime as a bundle file and carries its context as inert JSON; PERF-11: the static stylesheet is a bundle file; the page keeps only the per-render rule inline; PERF-11: two renders share the page shell although their context elements differ) checks the Runtime and stylesheet as bundle files scenario. That the bundle folder is always a resource root has no test (by reading updatePreview).
- Method: test/session/trustReq.requirements.test.ts (the pending page that clears the content and the missing-source page allow no local file) checks the Pending and Missing-source rows with a fake session through showPending and setMissingSource; the panel options of a new panel (localResourceRoots empty in src/host-vscode/activation.ts) are read from the code, not run.
- Method: test/session/toolbarReq.requirements.test.ts (in a read-only preview only the document's folder is allowed) checks the link rows; the same roots apply to a preview in an untrusted workspace.
- Method: test/security/trustReq.requirements.test.ts (a read-only preview reads includes from the folder of its document) checks the include rows by rendering with renderPreviewDocument in src/core/render/renderPipeline.ts with the folder of the document as resource root, an include below the folder and one of ../other.md.
- Criteria: The resource root of a read-only session equals dirname of the document path; that of a writable session equals the folder returned for the document by the workspace. The roots set on the panel are exactly the resource root plus the bundle folder when a bundle exists, and empty for the pending page that clears the content and for the missing-source page. navigationRoots is [document folder] when read-only. The html of a page holds the bundle URLs and no inline copy of the runtime. The roots of the include policy are the folder of the document and the resource root.
