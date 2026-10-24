---
type: StRS
id: StRS-MDOKFSTUDIO-DIAG-006
uuid: 9254b21e-ff7b-4d61-abe6-332c662824f6
title: Read PlantUML diagrams without any setup
description: When a writer previews a document with a PlantUML fence or
  directive, the Studio SHALL draw it with the bundled engine, in the preview
  colours, without Java or network.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I get PlantUML pictures right after installing the
  extension, also in Restricted Mode.
derived_by:
- SwRS-MDOKFSTUDIO-DIAG-019
- SwRS-MDOKFSTUDIO-DIAG-020
- SwRS-MDOKFSTUDIO-DIAG-022
- SwRS-MDOKFSTUDIO-DIAG-023
- SwRS-MDOKFSTUDIO-DIAG-026
- SwRS-MDOKFSTUDIO-DIAG-028
- SwRS-MDOKFSTUDIO-DIAG-029
- SwRS-MDOKFSTUDIO-DIAG-030
- SwRS-MDOKFSTUDIO-DIAG-031
- SwRS-MDOKFSTUDIO-DIAG-079
- SwRS-MDOKFSTUDIO-DIAG-080
- SwRS-MDOKFSTUDIO-DIAG-081
- SwRS-MDOKFSTUDIO-DIAG-083
- SwRS-MDOKFSTUDIO-DIAG-115
- SwRS-MDOKFSTUDIO-DIAG-119
---

## Read PlantUML diagrams without any setup

### Normative behavior

When a writer previews a document with a PlantUML fence or directive, the Studio SHALL draw it with the bundled engine, in the preview colours, without Java or network.

### Preserved stakeholder intent

Writers expect PlantUML to work from the first preview, without Java, Graphviz, a JAR, a process or network access.

As a writer, I get PlantUML pictures right after installing the extension, also in Restricted Mode.

### Rationale and constraints

- `plantuml` fences and `{plantuml}` or `{uml}` directives with a body produce a diagram labelled "PlantUML diagram", with the source in a collapsed "Diagram source" disclosure. The `@startuml` wrapper is the writer's; the extension adds none.
- The default engine is bundled and runs in the preview page: it starts no process, reads no executable or JAR, sends nothing over the network, and works in Restricted Mode. Its script is loaded only when the page has a PlantUML diagram and runs under the unchanged Content Security Policy.
- Pictures use light text on a dark preview and dark text on a light one, decided from the page background; a switch between light and dark draws every diagram again. The picture is inert and is centred and contained in the content width.
- The bundled `!theme` library and the OpenIconic `<&icon>` sprites work offline. Known issue: class-like diagrams use PlantUML's own Smetana layout instead of Graphviz, so some layouts differ from the JAR output.
- The engine ships pinned to an exact version of `@plantuml/core` (versions before 1.2026.6 are GPL) and its licence is packaged with it. An engine upgrade can change drawing output.
