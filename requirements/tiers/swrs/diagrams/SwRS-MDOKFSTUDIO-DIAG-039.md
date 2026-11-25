---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-039
uuid: 34742c40-549f-4806-b481-2bb97f064d4a
title: Built-in pictures are kept by source and drawn one at a time
description: 'When the page needs built-in diagrams, it SHALL show the kept result
  without running the engine when the source, include base and light or dark variant
  equal those of an earlier result, and otherwise run the engine for one diagram at
  a time in the order requested and skip a queued run whose renders were all superseded.'
project: markdown-okf-schema-studio
scope: diagrams
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-006
- StRS-MDOKFSTUDIO-DIAG-009
depends_on:
- SwRS-MDOKFSTUDIO-DIAG-009
scenarios:
- id: S1
  title: Patch and switch back
- id: S2
  title: Same text, different base
- id: S3
  title: Which results are kept
- id: S4
  title: One diagram at a time
- id: S5
  title: Queued runs of a superseded render are dropped
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/plantumlDiagram.ts
- src/page/modules/plantumlPreview.ts
tested_in_files:
- test/page/modules/plantumlDiagram.test.ts
- test/page/rendererBridge.test.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-DIAG-041
- SwRS-MDOKFSTUDIO-DIAG-042
- SwRS-MDOKFSTUDIO-DIAG-043
- SwRS-MDOKFSTUDIO-DIAG-044
---

## Built-in pictures are kept by source and drawn one at a time

### Normative behavior

When the page needs built-in diagrams, it SHALL show the kept result without running the engine when the source, include base and light or dark variant equal those of an earlier result, and otherwise run the engine for one diagram at a time in the order requested and skip a queued run whose renders were all superseded.

### Scenario S1 (nominal): Patch and switch back
- GIVEN a drawn diagram, a content patch that keeps its source, and a theme switch to dark and back
- WHEN the page draws the diagram again
- THEN when the source, include base and light or dark variant equal those of an earlier result, the page shows that result without running the engine
- AND the engine runs once for the light variant and once for the dark variant, not again on the switch back

### Scenario S2 (boundary): Same text, different base
- GIVEN two diagrams with the same text and different include bases
- WHEN the page draws both
- THEN the engine runs for each

### Scenario S3 (boundary): Which results are kept
| Input | Outcome |
| --- | --- |
| a diagram whose include the host refuses, drawn twice | the result is not kept: the host is asked again at the second render and a fixed file then shows the picture |
| a diagram whose included file holds an unsupported directive | the result is not kept, so the next render asks again |
| a diagram with a syntax error and no include problem, drawn twice with the same source | the second drawing shows the kept error without running the engine |

### Scenario S4 (nominal): One diagram at a time
- GIVEN two diagrams that each include a file, and a diagram waiting for the host's answer when a second one is requested
- WHEN both are drawn
- THEN the engine runs for one diagram at a time in the order requested, and the second starts after the first finished
- AND each include request belongs to the diagram that is drawing, and the second diagram does not read the first one's includes

### Scenario S5 (boundary): Queued runs of a superseded render are dropped
| Input | Outcome |
| --- | --- |
| ten renders of one diagram element requested in a row, each with a different include base | the engine runs at most twice; runs still waiting in the queue whose only renders were superseded (or whose element left the page) are not started |
| a queued run that a second, current element also waits for (same key) | the run still starts |

### Known issues
- Known issue: A plain engine failure (syntax error) is kept by the result cache and is not retried until the source or the variant changes, unlike an include failure.
- Known issue: The event wiring in plantumlPreview.ts is covered by the visual run only.

### Related requirements
- SwRS-MDOKFSTUDIO-DIAG-032: the failure messages whose results are kept or dropped here
- SwRS-MDOKFSTUDIO-DIAG-046: the include requests that belong to the diagram being drawn
- SwRS-MDOKFSTUDIO-DIAG-053: a changed served include file redraws its diagrams
- SwRS-MDOKFSTUDIO-DIAG-009: a content patch draws only new diagrams, and a superseded render does not overwrite a newer one

### Verification notes
- Method: test/page/modules/plantumlDiagram.test.ts (patch and switch back, different base, which results are kept, one diagram at a time)
- Criteria: Ten rapid renders of one element run the engine at most twice; A repeated key causes no engine run; the same source in the same theme renders once and a theme change renders again from the kept source; include failures are not cached and plain engine errors are; engine runs never overlap.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-006](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-006.md): A writer reads PlantUML diagrams without any setup
  - [StRS-MDOKFSTUDIO-DIAG-009](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-009.md): PlantUML diagrams use local include files and PUML files
- Depends on:
  - [SwRS-MDOKFSTUDIO-DIAG-009](SwRS-MDOKFSTUDIO-DIAG-009.md): Diagrams are drawn once per source and theme and late results are dropped
- Supersedes:
  - [SwRS-MDOKFSTUDIO-DIAG-041](SwRS-MDOKFSTUDIO-DIAG-041.md): Results with refused includes are not kept
  - [SwRS-MDOKFSTUDIO-DIAG-042](SwRS-MDOKFSTUDIO-DIAG-042.md): The built-in engine draws one diagram at a time
  - [SwRS-MDOKFSTUDIO-DIAG-043](SwRS-MDOKFSTUDIO-DIAG-043.md): A superseded built-in render does not overwrite a newer one
  - [SwRS-MDOKFSTUDIO-DIAG-044](SwRS-MDOKFSTUDIO-DIAG-044.md): A content patch draws only new built-in diagrams
<!-- okf:links:end -->
