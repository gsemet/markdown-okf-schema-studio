---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-105
uuid: e1a45a25-7904-44bd-9d76-e7de85bbf489
title: JAR results replace the diagrams of the current render in order
description: When the JAR pipeline finishes the diagrams of the current render,
  the extension SHALL match each result to its diagram in document order with
  the diagram's source line and replace the content of its diagram element with
  an image of alt text "PlantUML diagram" and a data URI of the SVG and state
  rendered, or with a paragraph of class myst-plantuml-error holding the message
  and the state error or unavailable.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-007
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-041
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/plantUmlRenderer.ts
- src/session/features/plantUml.ts
tested_in_files:
- test/core/preview/contentPatch.test.ts
- test/core/render/diagReq.jar.requirements.test.ts
- test/core/render/plantUmlRenderer.test.ts
- test/core/state/editLock.test.ts
- test/session/diagReq.plantuml.requirements.test.ts
- test/visual/scenarioDefinitions1.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-DIAG-106
- SwRS-MDOKFSTUDIO-DIAG-108
- SwRS-MDOKFSTUDIO-DIAG-109
- SwRS-MDOKFSTUDIO-DIAG-110
- SwRS-MDOKFSTUDIO-DIAG-111
- SwRS-MDOKFSTUDIO-DIAG-117
---

## JAR results replace the diagrams of the current render in order

### Normative behavior

When the JAR pipeline finishes the diagrams of the current render, the extension SHALL match each result to its diagram in document order with the diagram's source line and replace the content of its diagram element with an image of alt text "PlantUML diagram" and a data URI of the SVG and state rendered, or with a paragraph of class myst-plantuml-error holding the message and the state error or unavailable.

### Scenario (nominal): Results follow the document order
- GIVEN three diagrams that finish in another order
- WHEN the results are collected
- THEN result i belongs to diagram i and carries its source line
- AND a document with one diagram matches that one result to that diagram with its line

### Scenario (nominal): A result replaces the content of its diagram
- GIVEN a successful result and a failed result
- WHEN they are injected
- THEN the diagram element of the successful result holds the image of alt text "PlantUML diagram" and data-render-state rendered
- AND the diagram element of the failed result holds the paragraph of class myst-plantuml-error with the message and the failure's state (error or unavailable)

### Scenario (nominal): A working installation draws a loaded picture in both themes
- GIVEN a working JAR or plantuml command and a PlantUML diagram
- WHEN the preview is shown in a light theme and then in a dark theme
- THEN a loaded picture without an error appears in each and the expandable source disclosure is kept
- AND the pipeline asks for no dark variant

### Scenario (boundary): One failing diagram does not affect the others
| Input | Outcome |
| --- | --- |
| one failing diagram among three | the other two are pictures and the failing one shows its message |
| three failing diagrams | each shows its own message |

### Scenario (boundary): Results reach the page in place or as a full page
| Input | Outcome |
| --- | --- |
| incremental updates on, a page ready for the render stage, status lines that fit a patch and a plannable content patch | the page receives a content patch and keeps its state; the page is not reloaded |
| incremental updates on, a ready page, status lines that do not fit a patch | the whole page HTML is set |
| incremental updates off, a page not ready for the stage, or no plannable content patch | the whole page HTML is set |
| the injected page equals the current one and there are no warnings | nothing is done |

### Scenario (refusal): Results of an older render stage are dropped
- GIVEN a render superseded while its diagrams were drawing
- WHEN the old results arrive
- THEN they are not applied
- AND the results of the current render, when they arrive, are applied

### Scenario (nominal): Results wait for an open block edit
- GIVEN an open block editor and arriving JAR results (see SwRS-MDOKFSTUDIO-BLOCK-041)
- WHEN the results are ready
- THEN they are held and the editor stays open
- AND when the edit ends the held results are applied, the latest one winning

### Known issues
- Known issue: When the injected page equals the current one and there are no warnings, nothing is done.
- Known issue: Environment dependent: the visual scenarios of the working installation fail when plantuml is not on the PATH and are not routed through useJar.
- Known issue: The JAR and PATH pipeline draws the same SVG in the light and dark preview; only the built-in engine asks PlantUML for a dark variant.

### Related requirements
- SwRS-MDOKFSTUDIO-DIAG-084: how the JAR pipeline runs one process per diagram.
- SwRS-MDOKFSTUDIO-DIAG-089: the messages a failed diagram shows and the warning each failure adds.
- SwRS-MDOKFSTUDIO-DIAG-097: the bounds of a JAR render.

### Verification notes
- Method: test/core/render/diagReq.jar.requirements.test.ts `JAR results come back in document order with the source line of their diagram` and `one failing JAR diagram leaves the pictures of the other diagrams intact` (order, single failure, all fail).
- Method: test/core/render/plantUmlRenderer.test.ts (renders PlantUML through the configured external JAR and injects an image; image or message plus state).
- Method: test/core/preview/contentPatch.test.ts (injecting PlantUML diagrams into a page keeps its shell key, so the diagrams can be patched in; patch or full HTML according to readiness).
- Method: test/session/diagReq.plantuml.requirements.test.ts `JAR results of a render that is no longer the current one are dropped` (older render stage).
- Method: test/core/state/editLock.test.ts (deferred plantuml work, latest wins; open editor and editor closed).
- Method: test/visual/scenarioDefinitions1.ts, visual scenarios diagrams v04 and v05 (light and dark loaded picture).
- Criteria: Document order is preserved, failures are isolated, only the current stage is updated, an image or a message plus state is shown, and work is deferred while editing.
