---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-009
uuid: 895ffe95-2339-420d-bd1a-380f4f3740d5
title: "Mermaid diagrams are drawn once and late results are dropped"
description: "When the page needs a Mermaid diagram, the extension SHALL draw only
  the diagrams whose source or theme colours changed or that were never drawn, show
  an earlier drawing of the same source and theme colours without running Mermaid
  again, run the draw passes one at a time, and drop a result that arrives for a key
  the node no longer has."
project: markdown-okf-schema-studio
scope: diagrams
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/mermaidCache.ts
- src/page/modules/mermaidPreview.ts
tested_in_files:
- test/integration/realInput/markers.ts
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

## Mermaid diagrams are drawn once and late results are dropped

### Normative behavior

When the page needs a Mermaid diagram, the extension SHALL draw only the diagrams whose source or theme colours changed or that were never drawn, show an earlier drawing of the same source and theme colours without running Mermaid again, run the draw passes one at a time, and drop a result that arrives for a key the node no longer has.

### Scenario (nominal): Unchanged diagram after a node replacement

- GIVEN a Mermaid diagram already drawn, then a content update that replaces its node with the same source under the same theme
- WHEN the page draws the new node
- THEN the earlier picture is shown and Mermaid is not run

### Scenario (boundary): Changed source or theme

- GIVEN a drawn diagram whose source or theme colours changed
- WHEN the page draws it
- THEN Mermaid runs again; a theme attribute change that leaves the colours as they were draws nothing

### Scenario (nominal): A content patch draws only new diagrams

| Patch | Outcome |
| --- | --- |
| Adds a Mermaid diagram while another is already drawn | The page applies the patch and signals the replaced content; the new diagram is drawn and the earlier one is not rebuilt |
| The keyed morph keeps a drawn diagram through the patch | The diagram keeps its render state and its picture |

The page draws the diagrams that have no render state and leaves the diagrams that have one untouched.

### Scenario (boundary): Draw passes run one at a time

| Situation | Outcome |
| --- | --- |
| A content patch and a theme change are requested while a pass is running | The next pass starts only when the running pass finishes, in the order requested |
| A pass is requested before the Mermaid module has loaded | The pass starts after the load and not before |

### Scenario (refusal): A late picture for a replaced key is not shown

| Situation | Outcome |
| --- | --- |
| A diagram is being drawn for the dark theme, the theme changes to cream, and the dark drawing finishes after the cream pass was planned | The dark drawing is stored in the cache and the node shows only the cream drawing |
| A drawing finishes while its key is still the node's key | It is shown |

### Scenario (refusal): A late error for a replaced key is not shown

| Situation | Outcome |
| --- | --- |
| A drawing fails after the node was planned for another key | No error message is shown for the replaced key |
| A drawing fails for the node's current key | The error message is shown and the state is error |

### Known issues

- Known issue: The plan actions keep, reuse and render are wired in mermaidPreview.ts, which has no unit test.
- Known issue: The listener in mermaidPreview.ts that draws after a content patch is covered only by the real VS Code scenario.
- Known issue: Diagrams inside one pass are started together and document order only fixes their element ids.
- Known issue: The race protection of the draw passes and the guards against late results (picture and error) exist only in mermaidPreview.ts and are untested.

### Verification notes

- Method: test/page/modules/mermaidCache.test.ts (unchanged diagram after a node replacement, changed source or theme: same source and theme give no second run, a different source or theme gives a new run)
- Method: test/page/rendererBridge.test.ts (page events reach the diagram renderers: a content patch draws only new diagrams)
- Method: test/integration/realInput/markers.ts (real VS Code scenario RI-T34 in test/integration/realInput/renderPatching.ts: a Mermaid diagram is drawn again in the same frame)
- Method: draw passes one at a time, late picture and late error have no test (browser entry point mermaidPreview.ts; to be covered by a unit test of the queue)
- Criteria: Same source and theme give no second run; a different source or theme gives a new run; only diagrams without a render state are drawn after a patch; passes never overlap; only the current key's result reaches the node.

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
