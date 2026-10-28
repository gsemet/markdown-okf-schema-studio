---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-023
uuid: bdfc584b-8f53-4c21-8332-d4f0f4ec58cf
title: "PlantUML fences become centred inert pictures drawn by the built-in engine"
description: "When a document contains a plantuml fence, or a {plantuml} or {uml}
  directive with a body, the extension SHALL render a figure whose diagram element
  is labelled \"PlantUML diagram\" and holds the diagram text for the engine, with
  the same text in a collapsed \"Diagram source\" disclosure, which the built-in engine
  draws as one inert centred picture in the light or dark variant of the preview."
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-006
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/contentBlockStyles.ts
- src/core/render/mystNormalize.ts
- src/page/modules/plantumlDiagram.ts
- src/page/modules/plantumlPreview.ts
- src/session/webview.ts
tested_in_files:
- test/core/preview/diagReq.styles.requirements.test.ts
- test/core/render/mystFeatures.test.ts
- test/page/modules/plantumlDiagram.test.ts
- test/session/diagReq.webview.requirements.test.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-DIAG-028
- SwRS-MDOKFSTUDIO-DIAG-029
- SwRS-MDOKFSTUDIO-DIAG-030
- SwRS-MDOKFSTUDIO-DIAG-081
- SwRS-MDOKFSTUDIO-DIAG-083
- SwRS-MDOKFSTUDIO-DIAG-115
- SwRS-MDOKFSTUDIO-DIAG-119
---

## PlantUML fences become centred inert pictures drawn by the built-in engine

### Normative behavior

When a document contains a plantuml fence, or a {plantuml} or {uml} directive with a body, the extension SHALL render a figure whose diagram element is labelled "PlantUML diagram" and holds the diagram text for the engine, with the same text in a collapsed "Diagram source" disclosure, which the built-in engine draws as one inert centred picture in the light or dark variant of the preview.

### Scenario (nominal): Three forms

- GIVEN a plantuml fence, a {plantuml} directive and a {uml} directive, each with a body
- WHEN the preview is rendered
- THEN three PlantUML figures appear, each with a diagram element labelled "PlantUML diagram" holding the text and a collapsed "Diagram source" disclosure with the same text

### Scenario (boundary): Text kept as written

- GIVEN a body without an @startuml line
- WHEN the preview is rendered
- THEN the diagram text is exactly the body; the extension adds no wrapper

### Scenario (nominal): The built-in engine script loads only when needed

| Engine and content | Outcome |
| --- | --- |
| The built-in engine and content with a PlantUML figure | The page HTML holds one script tag with the page nonce, the bundle URL of plantumlPreview.js and the attribute data-sphinx-preview-plantuml |
| The built-in engine without a PlantUML figure | The page holds no built-in engine script |
| The JAR pipeline with a PlantUML figure | The page holds no built-in engine script |

### Scenario (nominal): A valid diagram is drawn as a picture

- GIVEN a valid PlantUML sequence diagram
- WHEN the page draws it with the built-in engine
- THEN the diagram element holds one image of class myst-plantuml-image with alt text "PlantUML diagram", a data:image/svg+xml source and data-render-state rendered; the source disclosure stays below

### Scenario (boundary): SVG with a script

- GIVEN engine output that contains a script element and a link
- WHEN the page shows it
- THEN the output is an image, so the script does not run and the link cannot be followed

### Scenario (nominal): Light or dark rendering follows the preview

| Preview background | Outcome |
| --- | --- |
| Computed background with a luminance below 0.18 | The page asks the built-in engine for the dark rendering |
| Computed background fully transparent | The light rendering is used |
| Any other background | The light rendering is used |
| Theme change from a dark to a light background | Every diagram is drawn again with the light rendering |
| Theme change that keeps the background dark | No diagram is drawn again |

### Scenario (boundary): Picture width, centring and source disclosure style

| Case | Outcome |
| --- | --- |
| PlantUML picture wider than the content column | Displayed at the column width with height auto, never set to a fixed width |
| PlantUML picture narrower than the column | Keeps its natural size and is centred (a block with margin-inline auto) |
| PlantUML picture as wide as the column | Fills the column |
| Source disclosure of a PlantUML figure | The summary uses the description colour, a pointer cursor and font size 0.9em, and the details has a top margin |
| Source disclosure of a Mermaid figure | Uses the same rules |

### Known issues

- Known issue: A PlantUML diagram with empty text is skipped by the engine and left blank, with no message (no test covers it).
- Known issue: The engine runs under the unchanged Content Security Policy (no eval, no worker, no WebAssembly, no network); docs/preview-lifecycle.md notes harmless style-src-attr violations in the console.
- Known issue: The theme observer in plantumlPreview.ts has no unit test.

### Verification notes

- Method: test/core/render/mystFeatures.test.ts (three forms, text kept as written: rendered HTML structure)
- Method: test/session/diagReq.webview.requirements.test.ts (the built-in PlantUML script is added once with the page nonce, only for the built-in engine and a figure)
- Method: test/page/modules/plantumlDiagram.test.ts (valid diagram drawn as a picture with a fake engine, light or dark rendering: luminance below 0.18 selects dark, transparent selects light)
- Method: test/visual/scenarioDefinitions2.ts (visual scenarios diagrams v10 and v11: picture drawn, SVG with a script, the variant change redraws all diagrams)
- Method: test/core/preview/diagReq.styles.requirements.test.ts (a PlantUML picture is scaled down to the column and never set to a fixed width; a PlantUML picture is a block centred with automatic inline margins; the PlantUML source disclosure has the rules of the Mermaid one)
- Criteria: Every form gives the same figure structure and the text is unchanged; the script tag follows the engine and the figure; a data-URI image with the rendered state replaces the text; luminance below 0.18 selects dark; max-width 100 percent, height auto, centred, and the disclosure rules equal the Mermaid ones. The dark-to-light theme observer has no unit test.
