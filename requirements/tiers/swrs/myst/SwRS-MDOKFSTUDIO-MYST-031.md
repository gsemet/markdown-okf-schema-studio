---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-031
uuid: 6fab5721-e6ce-402c-b04b-7e09350e2136
title: Figures render with image, caption, label, width and alignment
description: When a document holds a `{figure}` directive with colon or backtick
  fences, the extension SHALL render a figure with its image, `:alt:`, caption,
  `:name:` as id, a validated width and a validated alignment, mapped as one
  block from opening line to closing fence.
project: markdown-okf-schema-studio
scope: myst
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/directives/figure.ts
- src/core/render/mystBlockTransforms.ts
- src/core/render/mystNormalize.ts
- src/core/security/resource-policy.ts
tested_in_files:
- test/core/directives/registry.test.ts
- test/core/render/mystFeatures.test.ts
- test/core/render/mystPaletteRendering.test.ts
- test/security/html-policy.test.ts
- test/visual/scenarioDefinitions1.ts
default_owner_email: gaetan@xeberon.net
---

## Figures render with image, caption, label, width and alignment

### Normative behavior

When a document holds a `{figure}` directive with colon or backtick fences, the extension SHALL render a figure with its image, `:alt:`, caption, `:name:` as id, a validated width and a validated alignment, mapped as one block from opening line to closing fence.

### Scenario (nominal): A figure renders with image, alt, caption and id
- GIVEN a `{figure}` with alt, name and a caption body
- WHEN the preview renders
- THEN the figure shows image, alt, caption and id, the figure styles apply and the figure editor action is offered

### Scenario (boundary): Fence form and caption source
| Input | Outcome |
| --- | --- |
| The same figure with backtick fences | it maps from opening to closing fence as one block, rendering like the colon form |
| A figure whose body supplies the text | the text appears as caption, equal to the body |
| A figure without body | no caption is added |

### Scenario (nominal): A figure image outside the document folder loads
- GIVEN the long chapter with a figure whose image path is a sibling folder such as `../external-img/depot-graph.svg`
- WHEN the preview renders
- THEN the image has a natural size above zero, and when the chapter is scrolled to the landmark it stays in the frame

### Scenario (nominal): A valid width is kept
Applies to `{figure}` and `{image}`: a number, or a number with px, %, em or rem, is kept as data-okf-width; a plain number means pixels.
- GIVEN `:width: 60%` (or `50%` with align center)
- WHEN the preview renders
- THEN data-okf-width is 60% (both width and alignment kept) and the width attribute is removed

### Scenario (refusal): An invalid width is dropped
| Input | Outcome |
| --- | --- |
| `:width: calc(1px)` | the width is dropped |
| `:width: 60%;position:fixed` | the value is dropped and the sanitizer reports Removed an unsupported figure width |
| `:width: auto` | the value is dropped and the sanitizer reports Removed an unsupported figure width |
| A hand-edited bad value | the value is dropped and the sanitizer reports Removed an unsupported figure width |

The figure still renders when its width is dropped.

### Scenario (nominal): The page applies the width, also after updates
- GIVEN an image with `:width: 300`
- WHEN the page runs
- THEN the image gets that width, applied from the page without inline styles, including after every in-place content update

| Input | Outcome |
| --- | --- |
| A left-floated figure with `:width: 50%` and a content update | the figure takes the width, its image fills it and the percentage stays relative to the column |

### Scenario (nominal): Alignment sets an align class and float
| Input | Outcome |
| --- | --- |
| `:align: left` | the figure and image get an align class and float left beside the text |
| `:align: right` | the figure floats right, the next paragraph wraps beside it and top-level headings clear the float |
| `:align: center` | the figure and image get an align class and are centred |
| An unknown alignment | it is ignored (dropped) |

### Verification notes
- Method: test/core/render/mystFeatures.test.ts ("figures and plain images are mapped blocks with their closing source line": figure rendering and fence forms; "figure references render figures whose body supplies the caption": caption)
- Method: test/core/render/mystPaletteRendering.test.ts ("a figure keeps its width and alignment as data attributes and classes": width kept, `calc(1px)` dropped, alignment)
- Method: test/security/html-policy.test.ts ("data-okf-width keeps a plain length and nothing else": invalid widths and the sanitizer report; "resolves parent-relative figure images through the workspace root": outside folder)
- Method: test/core/directives/registry.test.ts ("every plug-in renders, styles the preview and names MyST palette actions that exist": figure styles and palette action)
- Method: visual scenario chapter-figure-dark in test/visual/scenarioDefinitions1.ts (image outside the folder, landmark in the frame)
- Method: visual scenario `figure-anchors-${theme}-${mode ?? "theme"}` in test/visual/scenarioDefinitions2.ts (width applied by the page, floats)
- Criteria: Both fence forms render alike. Only plain lengths and the three alignments survive. Loading follows the resource policy.
