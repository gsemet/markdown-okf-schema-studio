---
type: StRS
id: StRS-MDOKFSTUDIO-DIAG-013
uuid: 7b5ab471-5591-4bea-bc2e-11fd6fb839a0
title: Understand why a JAR-rendered diagram failed or was blocked
description: When a writer previews a PlantUML diagram whose JAR rendering is
  blocked or fails, the Studio SHALL show a message naming the cause on the
  diagram, and never start a process in an untrusted workspace.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I know whether Restricted Mode, a wrong path, a missing
  command or a PlantUML error stopped my diagram.
derived_by:
- SwRS-MDOKFSTUDIO-DIAG-025
- SwRS-MDOKFSTUDIO-DIAG-057
- SwRS-MDOKFSTUDIO-DIAG-082
- SwRS-MDOKFSTUDIO-DIAG-089
- SwRS-MDOKFSTUDIO-DIAG-090
- SwRS-MDOKFSTUDIO-DIAG-091
- SwRS-MDOKFSTUDIO-DIAG-092
- SwRS-MDOKFSTUDIO-DIAG-093
- SwRS-MDOKFSTUDIO-DIAG-094
- SwRS-MDOKFSTUDIO-DIAG-095
- SwRS-MDOKFSTUDIO-DIAG-096
- SwRS-MDOKFSTUDIO-DIAG-102
- SwRS-MDOKFSTUDIO-DIAG-107
---

## Understand why a JAR-rendered diagram failed or was blocked

### Normative behavior

When a writer previews a PlantUML diagram whose JAR rendering is blocked or fails, the Studio SHALL show a message naming the cause on the diagram, and never start a process in an untrusted workspace.

### Preserved stakeholder intent

Writers expect a blocked or failing JAR render to name its cause, and expect Restricted Mode to be a hard stop.

As a writer, I know whether Restricted Mode, a wrong path, a missing command or a PlantUML error stopped my diagram.

### Rationale and constraints

- In Restricted Mode with `useJar` on, no process starts: every PlantUML diagram shows "PlantUML preview is disabled in an untrusted workspace." with one warning each. The bundled engine is not swapped in silently.
- A `jarPath` that does not exist shows "The PlantUML JAR could not be found: followed by the path"; a directory shows "The PlantUML JAR path is not a file: followed by the path"; no process starts. The diagram state is `error`.
- A missing `plantuml` command shows `PlantUML executable "plantuml" was not found on PATH. Set markdownOkfSchemaStudio.plantuml.jarPath to a valid JAR path.` with the source kept and the state `unavailable`. Known issue: a missing Java gives the same wording about the executable "java", which does not name Java or Graphviz and misleads when `jarPath` is already set; a missing Graphviz is neither checked nor reported.
- A process exiting with an error shows `PlantUML exited with code N: followed by the error output` (or `signal S`, or "PlantUML returned no diagnostic."); output without `<svg` shows "PlantUML did not return SVG output."; a spawn that throws is reported the same way. A process that exits before reading its input, or a stdin error, becomes a normal message instead of crashing the extension host.
