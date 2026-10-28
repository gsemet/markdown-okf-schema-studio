---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-001
uuid: 0b6e83d2-0342-4f9a-8fa9-af6b80f8e294
title: The preview renders the unsaved buffer completely, in process
description: When the active Markdown buffer changes, the extension SHALL render
  the buffer text, saved or unsaved, completely to HTML inside the extension
  process and keep only the result of the newest edit.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
- StRS-MDOKFSTUDIO-CORE-003
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/mystEngine.ts
- src/core/render/mystRenderer.ts
- src/core/render/renderPipeline.ts
tested_in_files:
- test/core/render/mystFeatures.test.ts
- test/core/render/renderPipeline.test.ts
- test/core/render/renderReq.renderingCore.requirements.test.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
---

## The preview renders the unsaved buffer completely, in process

### Normative behavior

When the active Markdown buffer changes, the extension SHALL render the buffer text, saved or unsaved, completely to HTML inside the extension process and keep only the result of the newest edit.

### Scenario (nominal): Render the unsaved buffer in process

- GIVEN a Markdown document with unsaved edits is open in the editor and the file on disk holds older text
- WHEN the preview renders
- THEN the page shows the unsaved text, the rendered HTML matches the buffer text and not the disk text, and no Sphinx process or temporary file is used

### Scenario (nominal): Render the CommonMark constructs

- GIVEN a document with a heading of each level, a list, a quote, a thematic break, emphasis, a link, an image, inline code, strikethrough text and an h6 heading
- WHEN it is rendered
- THEN each construct appears as its matching HTML element, as the table shows

| Input | Outcome |
| --- | --- |
| headings h1 to h6 | matching heading element of each level; the h6 renders as a heading, not as a paragraph |
| paragraph | paragraph element |
| bullet list, numbered list | matching list element |
| block quote | block quote element |
| thematic break | thematic break element |
| emphasis, strong text | matching emphasis and strong elements |
| link, image | matching link and image elements |
| inline code | inline code element |
| strikethrough text | struck through |

### Scenario (nominal): Render identically in every palette mode

- GIVEN one document
- WHEN it is rendered once per palette mode (Strict, GFM, MyST), the mode changing buttons only
- THEN the three HTML outputs are byte-identical and the content HTML is unchanged

### Scenario (boundary): Render a very long document completely

- GIVEN a document of about 6000 lines, holding 335 sections and 336 headings
- WHEN it is rendered and the end of the page is scrolled to
- THEN all headings appear and the last paragraph is visible

### Scenario (refusal): Refuse the render when trust is required

| Input | Outcome |
| --- | --- |
| untrusted workspace, reduced mode not allowed, a render is requested | the render fails with the message "The MyST preview is disabled until the workspace is trusted." |
| reduced mode allowed, a render is requested | the render succeeds |

### Scenario (refusal): Cancel a superseded render

- GIVEN a render in progress
- WHEN a newer edit arrives
- THEN the old render is canceled with the message "The MyST render was canceled because a newer edit arrived." and its result is not shown

### Scenario (boundary): Discard the late result of a canceled render

- GIVEN a canceled render that completes late
- WHEN its result arrives
- THEN the page keeps the newer render

### Scenario (boundary): Warm the render engine at activation

- GIVEN the extension just activated and the MyST engine was loaded once at activation
- WHEN the first render runs
- THEN the engine is already loaded; if the warm-up import failed, the failure is swallowed and the activation shows no error, and the first render loads the engine again instead of failing with the cached error

### Verification notes

- Method: Unit test "the render pipeline retains buffer identity and attaches source diagnostics" in test/core/render/renderPipeline.test.ts (nominal unsaved buffer)
- Method: Unit test "the trust gate prevents renderer invocation unless reduced mode is allowed" in test/core/render/renderPipeline.test.ts (refusal trust)
- Method: Unit test "cancellation while rendering rejects a late successful result" in test/core/render/renderPipeline.test.ts (refusal cancel, boundary late result)
- Method: Unit test "the in-process renderer preserves the active-file MyST feature contract" in test/core/render/mystFeatures.test.ts (nominal CommonMark constructs)
- Method: Unit test "the rendered HTML is the same whatever the palette mode: the render takes no mode" in test/core/render/renderReq.renderingCore.requirements.test.ts (nominal palette modes)
- Method: Unit test "the warm-up loads the engine once, shares it with the render and a warm-up call never throws" in test/core/render/renderReq.renderingCore.requirements.test.ts (boundary warm-up) and "a failed engine load is not cached: the next render retries it"
- Method: Visual scenario rendering-core/v20-huge-document-bottom-dark-900 in test/visual/scenarioDefinitions2.ts (boundary very long document)
- Criteria: A render of a dirty buffer returns HTML for the buffer text and spawns no subprocess. The rendered HTML holds one matching element per CommonMark construct. Rendered HTML is the same in all three modes. All headings and the last paragraph are present. The pipeline throws the trust message only without the reduced-mode allowance (production always passes `allowUntrusted: true`, so this refusal is a guard tested at pipeline level). A late result of a superseded render is never applied. One engine load is shared; a warm-up failure is swallowed.
