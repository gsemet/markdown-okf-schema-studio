---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-009
uuid: 895ffe95-2339-420d-bd1a-380f4f3740d5
title: Diagrams are drawn once per source and theme and late results are dropped
description: 'When the page needs a Mermaid diagram, a PlantUML diagram drawn by the
  built-in engine or a chart, the extension SHALL draw only the diagrams whose source
  or theme colours changed or that were never drawn, show an earlier drawing of the
  same source and theme colours without running the engine again (a chart shows an
  earlier detached view of the same source and theme, never one that is on the page,
  keeps at most 16 views and finalizes an evicted or replaced one only when detached),
  run the Mermaid and PlantUML draw passes one at a time (so a later Mermaid theme
  is drawn only after the running pass ends), and, for a PlantUML diagram or a chart,
  drop a result that arrives for a key the node no longer has. When the JAR pipeline
  renders a diagram text that an earlier successful render already drew, the extension
  SHALL reuse that SVG without starting a process.'
project: markdown-okf-schema-studio
scope: diagrams
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-001
scenarios:
- id: S1
  title: Unchanged diagram after a node replacement
- id: S2
  title: Changed source or theme
- id: S3
  title: A content patch draws only new diagrams
- id: S4
  title: Draw passes run one at a time
- id: S5
  title: A late picture for a replaced key is not shown
- id: S6
  title: A late error for a replaced key is not shown
- id: S7
  title: The JAR pipeline reuses an earlier render
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/plantUmlRenderer.ts
- src/page/modules/chartViewCache.ts
- src/page/modules/mermaidCache.ts
- src/page/modules/mermaidPreview.ts
tested_in_files:
- test/integration/realInput/renderPatching.ts
- test/page/chartCsp.test.ts
- test/page/modules/diagReq.pageDiagrams.requirements.test.ts
- test/page/modules/mermaidCache.test.ts
- test/page/modules/mermaidPreviewEntry.test.ts
- test/page/rendererBridge.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-DIAG-011
- SwRS-MDOKFSTUDIO-DIAG-012
- SwRS-MDOKFSTUDIO-DIAG-014
- SwRS-MDOKFSTUDIO-DIAG-116
---

## Diagrams are drawn once per source and theme and late results are dropped

### Normative behavior

When the page needs a Mermaid diagram, a PlantUML diagram drawn by the built-in engine or a chart, the extension SHALL draw only the diagrams whose source or theme colours changed or that were never drawn, show an earlier drawing of the same source and theme colours without running the engine again (a chart shows an earlier detached view of the same source and theme, never a view that is on the page, keeps at most 16 views and finalizes an evicted or replaced view only when it is detached), run the Mermaid and PlantUML draw passes one at a time (so a later Mermaid theme is drawn only after the running pass ends), and, for a PlantUML diagram or a chart, drop a result that arrives for a key the node no longer has.

When the JAR pipeline renders a diagram text that an earlier successful render already drew, the extension SHALL reuse that SVG without starting a process.

### Scenario S1 (nominal): Unchanged diagram after a node replacement

- GIVEN a Mermaid diagram already drawn, then a content update that replaces its node with the same source under the same theme
- WHEN the page draws the new node
- THEN the earlier picture is shown and Mermaid is not run; the page keeps the 64 most recent Mermaid drawings, by source and theme colours

### Scenario S2 (boundary): Changed source or theme

- GIVEN a drawn diagram whose source or theme colours changed
- WHEN the page draws it
- THEN Mermaid runs again; a theme attribute change that leaves the colours as they were draws nothing

### Scenario S3 (nominal): A content patch draws only new diagrams

| Patch | Outcome |
| --- | --- |
| Adds a Mermaid diagram while another is already drawn | The page applies the patch and signals the replaced content; the new diagram is drawn and the earlier one is not rebuilt |
| The keyed morph keeps a drawn diagram through the patch | The diagram keeps its render state and its picture |
| Adds a PlantUML diagram next to a drawn one (built-in engine) | Only the new diagram, which has no render state, is drawn; the others are left untouched |
| Replaces a PlantUML node with the same source and variant | The kept result is shown and the engine is not run |

The page draws the diagrams that have no render state and leaves the diagrams that have one untouched.

### Scenario S4 (boundary): Draw passes run one at a time

| Situation | Outcome |
| --- | --- |
| A content patch and a theme change are requested while a pass is running | The next pass starts only when the running pass finishes, in the order requested |
| A pass is requested before the Mermaid module has loaded | The pass starts after the load and not before |

### Scenario S5 (refusal): A late picture for a replaced key is not shown

| Situation | Outcome |
| --- | --- |
| A Mermaid diagram is being drawn for the dark theme and the theme changes to cream | The cream pass starts only after the dark pass ends (passes run one at a time, so no Mermaid result arrives for a replaced key); the dark drawing is stored in the cache and shown, then the cream drawing replaces it |
| A Mermaid drawing finishes while its key is still the node's key | It is shown |
| A PlantUML diagram is drawn, a theme switch starts a second render of the element, and the first finishes after the second | Only the second render's picture is shown; the first result is dropped and the element is unchanged |
| A chart is drawn, a newer theme replaces it while it runs | The result is cached and not shown |

### Scenario S6 (refusal): A late error for a replaced key is not shown

| Situation | Outcome |
| --- | --- |
| A PlantUML drawing fails after a newer render took the element | No error message is shown for the replaced key |
| A Mermaid drawing fails for the node's current key | The error message is shown and the state is error |

### Scenario S7 (nominal): The JAR pipeline reuses an earlier render

| Input | Outcome |
| --- | --- |
| the same diagram text rendered twice under one JAR, with the same command, arguments, workspace root, security profile and JAR size and modification time | one process starts; the second render returns the same SVG |
| another diagram text, a replaced JAR, or an earlier failure | a process starts (a failed render is never kept) |
| a diagram text with an include, import, theme, pragma or environment-reading directive | it is never reused: a process starts each time |

### Known issues

- Known issue: The plan actions keep, reuse and render are wired in mermaidPreview.ts, which has no unit test.
- Known issue: The listener in mermaidPreview.ts that draws after a content patch is covered only by the real VS Code scenario.
- Known issue: Diagrams inside one pass are started together and document order only fixes their element ids.
- Known issue: The JAR cache holds up to 64 diagrams in memory and is not cleared when a file read by an include directive changes, so such diagrams are simply never cached.

### Verification notes

- Method: test/page/modules/mermaidCache.test.ts (unchanged diagram after a node replacement, changed source or theme: same source and theme give no second run, a different source or theme gives a new run)
- Method: test/page/modules/chartViewCache.test.ts (the keep, reuse and render plans, an attached view never reused, 16 views, the least recently used one evicted, finalize only when detached)
- Method: test/page/chartCsp.test.ts (two identical charts get two views, the return to a theme shows the same svg element)
- Method: test/page/rendererBridge.test.ts (page events reach the diagram renderers: a content patch draws only new diagrams)
- Method: real VS Code scenario RI-T34 in test/integration/realInput/renderPatching.ts (a Mermaid diagram is drawn again in the same frame)
- Method: test/core/render/plantUmlCache.test.ts `a second render of the same source starts no process` (the JAR pipeline reuses an earlier render)
- Method: test/page/modules/plantumlDiagram.test.ts (a PlantUML patch draws only new diagrams, a superseded render does not overwrite a newer one)
- Method: test/page/modules/mermaidPreviewEntry.test.ts `Mermaid draw passes run one at a time, in the order they were requested` (draw passes one at a time)
- Method: test/page/modules/mermaidPreviewEntry.test.ts `a Mermaid theme change during a drawing is drawn after that drawing ends` (a later theme is drawn only after the running pass ends; the replaced-key rule is tested on PlantUML and charts)
- Method: test/page/modules/mermaidPreviewEntry.test.ts `a failed Mermaid drawing shows one error for the current key and sets the error state` (a late error, the row of the current key)
- Method: test/page/modules/diagReq.pageDiagrams.requirements.test.ts `a PlantUML drawing that fails after a newer render took the element shows no error` (a late error, the PlantUML row of the replaced key: no error message and no error state, then the newer picture is shown)
- Method: test/page/modules/diagReq.pageDiagrams.requirements.test.ts `a theme attribute change that leaves the Mermaid colours as they were draws nothing` (changed source or theme: an attribute change with the same colours draws nothing)
- Criteria: Same source and theme give no second run; a different source or theme gives a new run; only diagrams without a render state are drawn after a patch; passes never overlap; a later Mermaid theme is drawn only after the running pass ends; for PlantUML and charts only the current key's result reaches the node; the JAR pipeline starts no process for an unchanged diagram text.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-001](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-001.md): A writer reads and inserts Mermaid diagrams that follow the theme
- Supersedes:
  - [SwRS-MDOKFSTUDIO-DIAG-011](SwRS-MDOKFSTUDIO-DIAG-011.md): A content patch draws only Mermaid diagrams not yet drawn
  - [SwRS-MDOKFSTUDIO-DIAG-012](SwRS-MDOKFSTUDIO-DIAG-012.md): Mermaid draw passes run one at a time
  - [SwRS-MDOKFSTUDIO-DIAG-014](SwRS-MDOKFSTUDIO-DIAG-014.md): A late Mermaid result for a replaced theme is not shown
  - [SwRS-MDOKFSTUDIO-DIAG-116](SwRS-MDOKFSTUDIO-DIAG-116.md): A late Mermaid error for a replaced key is not shown
<!-- okf:links:end -->
