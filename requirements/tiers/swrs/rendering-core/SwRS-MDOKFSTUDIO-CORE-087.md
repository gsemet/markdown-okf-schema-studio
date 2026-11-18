---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-087
uuid: ecd0e8f3-b55b-4bbe-adf3-0dec895d2863
title: The site requirements viewer shows the use case diagram of a StRS
description: When a maintainer builds the Pages site and a use case (StRS) has a
  Use case diagram section holding a Mermaid fence, the build SHALL draw the
  diagram as an inline SVG in the site's colours on the page of the use case,
  under the user need, readable without JavaScript, and SHALL stop with the use
  case id and Mermaid's message when a fence cannot be drawn.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TRUST-014
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- test/site/requirementsViewer/useCaseDiagram.ts
tested_in_files:
- test/site/requirementsViewer/model.test.ts
- test/site/requirementsViewer/pages.test.ts
- test/site/requirementsViewer/useCaseDiagram.test.ts
default_owner_email: gaetan@xeberon.net
---

## The site requirements viewer shows the use case diagram of a StRS

### Normative behavior

When a maintainer builds the Pages site and a use case (StRS) has a Use case diagram section holding a Mermaid fence, the build SHALL draw the diagram as an inline SVG in the site's colours on the page of the use case, under the user need, readable without JavaScript, and SHALL stop with the use case id and Mermaid's message when a fence cannot be drawn.

### Scenario (nominal): A diagram under the user need

- GIVEN a use case whose file has a `### Use case diagram` section with one Mermaid fence
- WHEN the site is built
- THEN the page of the use case shows the diagram as an inline SVG in the site's colours under the user need, before the map, and the page needs no JavaScript to show it

### Scenario (boundary): No diagram

- GIVEN a use case with no `### Use case diagram` section, or a section with no Mermaid fence
- WHEN the site is built
- THEN its page is exactly the page built without this behaviour

### Scenario (refusal): A fence Mermaid cannot draw

- GIVEN a use case whose Mermaid fence Mermaid cannot draw
- WHEN the site is built
- THEN the build stops with an error that names the use case id, its file and Mermaid's message, and writes no diagram of it

### Verification notes

- Method: Unit tests in test/site/requirementsViewer/useCaseDiagram.test.ts (extraction, drawing with Chromium, a broken fence) and test/site/requirementsViewer/pages.test.ts (place of the figure, page unchanged without a diagram).
- Criteria: The SVG carries the cream ink colour and no script; the figure sits after the user need and before the map; the error names the id and Mermaid's message.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TRUST-014](../../strs/trust-security/StRS-MDOKFSTUDIO-TRUST-014.md): The extension is built from pinned dependencies and ships what it loads
<!-- okf:links:end -->
