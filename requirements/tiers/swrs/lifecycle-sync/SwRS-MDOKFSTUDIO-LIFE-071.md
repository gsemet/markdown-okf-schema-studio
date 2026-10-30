---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-071
uuid: 25bcd945-29ca-4d8d-a4ee-75c224d88179
title: A render that cannot patch loads a new page document
description: When a render changes the page shell, for example a diagram engine
  or math appears or disappears, or cannot otherwise be applied to the loaded
  page as a content patch, the extension SHALL load a new page document instead
  of a content patch.
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-005
- StRS-MDOKFSTUDIO-LIFE-010
- StRS-MDOKFSTUDIO-LIFE-014
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/contentPatch.ts
- src/session/features/pageDocument.ts
- src/session/pageMessages.ts
tested_in_files:
- test/core/preview/contentPatch.test.ts
- test/host/previewTiming.test.ts
default_owner_email: gaetan@xeberon.net
---

## A render that cannot patch loads a new page document

### Normative behavior

When a render changes the page shell, for example a diagram engine or math appears or disappears, or cannot otherwise be applied to the loaded page as a content patch, the extension SHALL load a new page document instead of a content patch.

### Scenario (nominal): Shell change

| Input | Outcome |
| --- | --- |
| A ready page without math and a render that adds a formula | The shell keys differ and the whole page is assigned |
| A page where Mermaid appears or disappears | The shell keys differ and the whole page is assigned |
| A render that only changes text | The shell keys are equal, so the patch is used |

### Scenario (boundary): Content bounds

| Input | Outcome |
| --- | --- |
| New content that holds a script element or a nonce attribute | No patch is planned and the whole page loads |
| A content container of 20 MiB plus one character | The patch is refused, because MAX_PATCH_CONTENT_LENGTH is 20 MiB, and the whole page loads |

### Scenario (boundary): Status line bounds

| Input | Outcome |
| --- | --- |
| A render with 501 diagnostics | diagnosticsFitPatch is false and the whole page loads |
| A render with exactly 500 short diagnostics | The patch is used |
| A status line longer than 20000 characters | diagnosticsFitPatch is false and the whole page loads |
| A severity longer than 50 characters | diagnosticsFitPatch is false and the whole page loads |

### Scenario (refusal): Another document, folders or startup setting

| Input | Outcome |
| --- | --- |
| A change of scrollPreviewWithEditor, scrollEditorWithPreview, markEditorSelection or stickyHeadingDepth, then the next render is shown | The runtime context key differs, so the page document is assigned again and the new value reaches the page in its boot context |
| The new render shows another document or source file | A new document is loaded the same way |
| The new render uses other resource folders | A new document is loaded the same way |
| A change of showComments, which the page follows through a message | The context key is not affected and a patch stays possible |

### Scenario (refusal): Page not ready for the previous render

| Input | Outcome |
| --- | --- |
| A render shown while the page of the previous render has not reported ready, then a newer render finishes | The whole page is assigned |
| A patch posted and not yet acknowledged, then a newer render finishes | A further patch is addressed to the identifiers the page will have, because pageHasStage accepts the patched request id |

### Scenario (boundary): The wait of 2 seconds for a patched page

| Input | Outcome |
| --- | --- |
| A posted patch and a page that never answers, 2000 ms pass | The page document is assigned for the stage |
| A page that reports ready in time | The page keeps its document |
| Three patches posted in a row and a ready report for the first | The 2 second wait restarts for the newest stage |
| A ready report that names the newest stage | The timer is cleared and the document is kept |

### Scenario (nominal): Page created again by VS Code

- GIVEN a page patched several times whose webview is created again when the editor moves to another window
- WHEN the new page reports ready with the identifiers of the last assignment, not those of the current render
- THEN the host recognizes it and assigns the current document again; a report with the identifiers of the current render triggers no reload

### Related requirements

- SwRS-MDOKFSTUDIO-LIFE-069: the content patch that is used when no condition here is met

### Verification notes

- Method: test/core/preview/contentPatch.test.ts (Shell change, Content bounds, Status line bounds, Another document, folders or startup setting, Page created again by VS Code): "T34: shell keys differ when Mermaid appears or disappears, and when math appears", "T34: canPatch refuses next content that carries a script or a nonce", "T34: status lines that the runtime would reject keep the patch from being sent", "T34: the runtime context key covers the startup settings and nothing the page follows itself", "T34: a ready report with the identifiers of the last assignment is a webview that was created again". The size bound of Content bounds has no test (untested); the resource folders check (sameResourceRoots) is by reading updatePreview.
- Method: test/host/previewTiming.test.ts (Page not ready for the previous render, The wait of 2 seconds for a patched page, Page created again by VS Code): "a patched page that does not report ready within 2000 ms gets the full document", "a patched page that reports ready in time keeps its document", "a ready report for an earlier patch of a chain restarts the 2000 ms wait for the newest", "a page reloaded by the webview after patches gets the current document again". The refusal row of Page not ready for the previous render is untested; the chain acknowledgement is covered by "a patched page that reports ready in time keeps its document" and checked by reading pageHasStage and updatePreview.
- Criteria: shellKey differs when an engine appears and is equal otherwise; planContentPatch returns undefined for those contents; diagnosticsFitPatch is false past each of the three bounds; runtimeContextKey and the resource folders are compared before a patch; the patch condition requires readyRequestId or patchedRequestId to equal the previous stage's request; htmlAssignments grows after 2000 ms for a silent page and stays for an answering page; the fallback timer is re-armed for the stage after an earlier ready report; reportsReloadedDocument is true only when the request id equals the assigned one and differs from the stage's.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-005](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-005.md): The preview updates in place as the text and its dependencies change
  - [StRS-MDOKFSTUDIO-LIFE-010](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-010.md): The panes scroll together and the reading position survives updates
  - [StRS-MDOKFSTUDIO-LIFE-014](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-014.md): Previews come back after a reload, remember recent documents and leave nothing behind
<!-- okf:links:end -->
