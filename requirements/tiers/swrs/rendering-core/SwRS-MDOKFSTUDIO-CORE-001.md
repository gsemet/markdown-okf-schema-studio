---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-001
uuid: 0b6e83d2-0342-4f9a-8fa9-af6b80f8e294
title: The preview renders the unsaved buffer in process and keeps the newest
  edit
description: When the active Markdown buffer changes, the extension SHALL render
  the buffer text, saved or unsaved, completely to HTML inside the extension
  process and keep only the result of the newest edit.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: proposed
status: stable
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
- test/core/render/renderPipeline.test.ts
- test/core/render/renderReq.renderingCore.requirements.test.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-CORE-002
- SwRS-MDOKFSTUDIO-CORE-021
- SwRS-MDOKFSTUDIO-CORE-026
- SwRS-MDOKFSTUDIO-CORE-038
- SwRS-MDOKFSTUDIO-CORE-046
---

## The preview renders the unsaved buffer in process and keeps the newest edit

### Normative behavior

When the active Markdown buffer changes, the extension SHALL render the buffer text, saved or unsaved, completely to HTML inside the extension process and keep only the result of the newest edit.

### Scenario (nominal): Render the unsaved buffer in process

- GIVEN a Markdown document with unsaved edits is open in the editor and the file on disk holds older text
- WHEN the preview renders
- THEN the page shows the unsaved text, the rendered HTML matches the buffer text and not the disk text, and no Sphinx process or temporary file is used

### Scenario (refusal): Cancel a superseded render

- GIVEN a render in progress
- WHEN a newer edit arrives
- THEN the old render is canceled with the message "The MyST render was canceled because a newer edit arrived." and its result is not shown

### Scenario (boundary): Discard the late result of a canceled render

- GIVEN a canceled render that completes late
- WHEN its result arrives
- THEN the page keeps the newer render

### Verification notes

- Method: Unit test "the render pipeline retains buffer identity and attaches source diagnostics" in test/core/render/renderPipeline.test.ts (nominal unsaved buffer)
- Method: Unit test "cancellation while rendering rejects a late successful result" in test/core/render/renderPipeline.test.ts (refusal cancel, boundary late result)
- Criteria: A render of a dirty buffer returns HTML for the buffer text and spawns no subprocess. A late result of a superseded render is never applied.
- Not behaviours of this requirement: the warm-up of the MyST engine at activation is an optimisation (test/core/render/renderReq.renderingCore.requirements.test.ts: the warm-up loads the engine once, a warm-up call never throws, a failed engine load is not cached); the trust refusal of the pipeline ("The MyST preview is disabled until the workspace is trusted.", tested in test/core/render/renderPipeline.test.ts) is a pipeline guard that production never reaches, because it always passes `allowUntrusted: true`, so no scenario promises it. The CommonMark constructs, the palette modes and the long document are SwRS-MDOKFSTUDIO-CORE-088.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-001](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-001.md): A reader reads a faithful rendering of any document
  - [StRS-MDOKFSTUDIO-CORE-003](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-003.md): A reader sees what cannot be rendered and keeps a usable preview
- Supersedes:
  - [SwRS-MDOKFSTUDIO-CORE-002](SwRS-MDOKFSTUDIO-CORE-002.md): Render the CommonMark blocks
  - [SwRS-MDOKFSTUDIO-CORE-021](SwRS-MDOKFSTUDIO-CORE-021.md): Refuse the render when trust is required
  - [SwRS-MDOKFSTUDIO-CORE-026](SwRS-MDOKFSTUDIO-CORE-026.md): Cancel a superseded render
  - [SwRS-MDOKFSTUDIO-CORE-038](SwRS-MDOKFSTUDIO-CORE-038.md): Render a very long document completely
  - [SwRS-MDOKFSTUDIO-CORE-046](SwRS-MDOKFSTUDIO-CORE-046.md): Render identically in every palette mode
<!-- okf:links:end -->
