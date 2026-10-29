---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-001
uuid: d61c8d15-c492-4c29-a582-3c61cd95f0e8
title: "Mermaid fences become inert diagram pictures"
description: "When a document contains a mermaid fence or a {mermaid} directive, the
  extension SHALL render a figure whose diagram element is labelled \"Mermaid diagram\"\
  \ and holds the diagram text, with the same text in a collapsed \"Diagram source\"\
  \ disclosure, and have the page draw it as one inert picture that fits the content
  column."
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-001
- StRS-MDOKFSTUDIO-DIAG-006
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/contentBlockStyles.ts
- src/core/preview/styles/editModeStyles.ts
- src/core/render/mermaidFont.ts
- src/core/render/mystNormalize.ts
- src/page/modules/mermaidPreview.ts
- src/session/webview.ts
tested_in_files:
- test/build/bundleSplit.test.ts
- test/core/preview/contentPatch.test.ts
- test/core/preview/previewStyles.test.ts
- test/core/render/mystFeatures.test.ts
- test/integration/projectFeatures.test.ts
- test/page/diagReq.diagramEdit.requirements.test.ts
- test/page/mermaidLabelFit.test.ts
- test/page/modules/mermaidPreviewEntry.test.ts
- test/visual/scenarioDefinitions1.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-DIAG-002
- SwRS-MDOKFSTUDIO-DIAG-003
- SwRS-MDOKFSTUDIO-DIAG-004
- SwRS-MDOKFSTUDIO-DIAG-022
---

## Mermaid fences become inert diagram pictures

### Normative behavior

When a document contains a mermaid fence or a {mermaid} directive, the extension SHALL render a figure whose diagram element is labelled "Mermaid diagram" and holds the diagram text, with the same text in a collapsed "Diagram source" disclosure, and have the page draw it as one inert picture that fits the content column.

### Scenario (nominal): Fence and directive

- GIVEN a document with a mermaid fence and a {mermaid} directive, each holding a flowchart
- WHEN the preview is rendered
- THEN two Mermaid figures appear, each with a diagram element labelled "Mermaid diagram" holding the flowchart text and a collapsed details element whose summary reads "Diagram source" and whose code block holds the same text

### Scenario (boundary): Empty diagram

- GIVEN a mermaid fence with no text
- WHEN the preview is rendered
- THEN a figure with an empty diagram element is still produced, the page draws nothing in it and shows no message

### Scenario (nominal): The renderer script loads only with a Mermaid figure

| Rendered content | Outcome |
| --- | --- |
| Contains a figure of class myst-mermaid-figure | The preview page HTML holds one script tag with the page nonce, the bundle URL of mermaidPreview.js and the attribute data-sphinx-preview-mermaid |
| Contains a PlantUML figure but no Mermaid figure | The preview page HTML holds no Mermaid script tag |

### Scenario (nominal): Valid flowchart is drawn as a picture

- GIVEN a valid Mermaid flowchart
- WHEN the page draws the diagram
- THEN the diagram element holds one image of class myst-mermaid-image with alt text "Mermaid diagram" and a src starting with data:image/svg+xml;charset=utf-8 (an SVG drawn at the strict security level), the diagram text is replaced, and data-render-state is rendered

### Scenario (nominal): Labels fit their boxes in the picture

- GIVEN a flowchart with node labels ("Review telemetry", "Hold and inspect") and edge labels ("Yes", "No"), drawn with Mermaid's HTML labels
- WHEN the page draws the diagram and shows it as an SVG image
- THEN Mermaid measures the labels inside an element of class myst-mermaid-measure that the page style sheet gives a pinned system font stack and a 16px size, with no inherited page style, and that is removed once the diagram is drawn
- AND the Mermaid configuration and theme variables carry the same font family and size, so the image draws each label with the metrics it was measured with
- AND in the image, the text of every label fits its label box and, for a node, its shape: no label loses its last characters

### Scenario (boundary): Line-break tags in the SVG

- GIVEN Mermaid output whose SVG contains HTML line-break tags written without a closing slash
- WHEN the page builds the image source
- THEN the data URI holds the self-closing form of each line-break tag so the SVG loads as an image

### Scenario (boundary): Picture width against the content column

| Picture | Outcome |
| --- | --- |
| Natural width exceeds the content column | Displayed at the column width with its height scaled in proportion (max-width 100 percent, height auto) |
| Narrower than the content column | Keeps its natural size, is not enlarged and is centred |

### Scenario (nominal): A diagram under edit is hidden

| Event | Outcome |
| --- | --- |
| A block editor opens on the diagram block of a Mermaid figure in edit mode | The figure carries data-sphinx-preview-editing true and is not displayed (display none), with the editor placed right after it |
| The editor closes | The attribute is removed and the diagram is displayed again |

### Known issues

- Known issue: The page skips a Mermaid diagram whose text is empty and leaves it blank, with no diagnostic (no test covers it).
- Known issue: Appearing or disappearing Mermaid changes the shell key, so the whole page reloads instead of being patched in place.
- Known issue: No test asserts that the Content Security Policy lets the Mermaid bundle run; only a real VS Code run would show such a regression.
- Known issue: Scripts and links inside the SVG are inert because the picture is an image with a data URI and Mermaid runs at the strict security level; this is not documented.
- Known issue: mermaidPreview.ts has no unit test.
- Known issue: There is no minimum scale and no zoom: a very wide diagram is scaled until its labels become small. The unit test locks the containment, not a minimum label size.
- Known issue: There is no live preview of the diagram while it is edited (absent from docs/known-limitations.md).
- Known issue: A theme change still redraws a hidden Mermaid diagram because the theme observer draws every diagram.

### Scenario (nominal): The renderer loads the diagram types it needs
- GIVEN a document with a Mermaid figure
- WHEN the page loads the renderer
- THEN the script tag is `type="module"` and its entry file is small
- AND each diagram type and the layout engine are chunks fetched when a diagram needs them

### Verification notes

- Method: test/core/render/mystFeatures.test.ts (fence and directive, empty diagram: rendered HTML structure)
- Method: test/visual/scenarioDefinitions1.ts (visual scenarios diagrams v01 to v03: fence and directive, loaded picture, picture not enlarged)
- Method: test/core/preview/contentPatch.test.ts (renderer script loads only with a Mermaid figure, shell key)
- Method: test/integration/projectFeatures.test.ts (script tag and bundle folder resource root exist)
- Method: test/core/preview/previewStyles.test.ts (picture width against the content column)
- Method: test/page/diagReq.diagramEdit.requirements.test.ts (a diagram block is hidden while its editor is open and shown again when it closes)
- Method: line-break tags and the drawn picture have no unit test of the browser entry point mermaidPreview.ts (untested apart from the visual scenarios)
- Criteria: Both syntaxes give the same figure structure; an empty fence gives an empty diagram element; the script tag appears only with a Mermaid figure; a loaded image replaces the text and carries the rendered state; the stylesheet contains the containment rules and the picture is never larger than its natural size; the block is hidden only while its editor is open.
- Method: test/build/bundleSplit.test.ts (the renderer entry is small and the rest is split into chunks)
- Method: test/page/mermaidLabelFit.test.ts (headless Chromium: the shown SVG opened as a document of its own, every label's text inside its box; the in-page measure of the real-window check agrees with it)
- Method: test/page/modules/mermaidPreviewEntry.test.ts (Mermaid measures in the styled measure element, removed after the drawing)
- Method: test/integration/realInput/previewWindow.ts (real VS Code window: every label of the demo flowchart fits its box as the image draws it)
