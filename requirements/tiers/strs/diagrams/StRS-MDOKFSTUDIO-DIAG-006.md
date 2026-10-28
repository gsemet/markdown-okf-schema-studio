---
type: StRS
id: StRS-MDOKFSTUDIO-DIAG-006
uuid: 9254b21e-ff7b-4d61-abe6-332c662824f6
title: A writer reads PlantUML diagrams without any setup
description: When a writer previews a document with a PlantUML fence or
  directive, the Studio SHALL draw it with the bundled engine, in the preview
  colours, without Java or network, and show a message that names the cause and
  the JAR option and keep the source readable when the bundled engine cannot
  draw it.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: proposed
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I get PlantUML pictures right after installing the
  extension, also in Restricted Mode, and learn why a diagram has no picture and
  what to change instead of seeing a blank block.
derived_by:
- SwRS-MDOKFSTUDIO-DIAG-001
- SwRS-MDOKFSTUDIO-DIAG-019
- SwRS-MDOKFSTUDIO-DIAG-020
- SwRS-MDOKFSTUDIO-DIAG-022
- SwRS-MDOKFSTUDIO-DIAG-023
- SwRS-MDOKFSTUDIO-DIAG-024
- SwRS-MDOKFSTUDIO-DIAG-026
- SwRS-MDOKFSTUDIO-DIAG-028
- SwRS-MDOKFSTUDIO-DIAG-029
- SwRS-MDOKFSTUDIO-DIAG-030
- SwRS-MDOKFSTUDIO-DIAG-031
- SwRS-MDOKFSTUDIO-DIAG-032
- SwRS-MDOKFSTUDIO-DIAG-033
- SwRS-MDOKFSTUDIO-DIAG-034
- SwRS-MDOKFSTUDIO-DIAG-035
- SwRS-MDOKFSTUDIO-DIAG-036
- SwRS-MDOKFSTUDIO-DIAG-037
- SwRS-MDOKFSTUDIO-DIAG-038
- SwRS-MDOKFSTUDIO-DIAG-039
- SwRS-MDOKFSTUDIO-DIAG-040
- SwRS-MDOKFSTUDIO-DIAG-041
- SwRS-MDOKFSTUDIO-DIAG-042
- SwRS-MDOKFSTUDIO-DIAG-043
- SwRS-MDOKFSTUDIO-DIAG-044
- SwRS-MDOKFSTUDIO-DIAG-045
- SwRS-MDOKFSTUDIO-DIAG-053
- SwRS-MDOKFSTUDIO-DIAG-079
- SwRS-MDOKFSTUDIO-DIAG-080
- SwRS-MDOKFSTUDIO-DIAG-081
- SwRS-MDOKFSTUDIO-DIAG-082
- SwRS-MDOKFSTUDIO-DIAG-083
- SwRS-MDOKFSTUDIO-DIAG-112
- SwRS-MDOKFSTUDIO-DIAG-115
- SwRS-MDOKFSTUDIO-DIAG-119
- SwRS-MDOKFSTUDIO-REVIEW-017
- SwRS-MDOKFSTUDIO-REVIEW-038
- SwRS-MDOKFSTUDIO-TRUST-074
- SwRS-MDOKFSTUDIO-TRUST-075
default_owner_email: gaetan@xeberon.net
---

## A writer reads PlantUML diagrams without any setup

### Normative behavior

When a writer previews a document with a PlantUML fence or directive, the Studio SHALL draw it with the bundled engine, in the preview colours, without Java or network, and show a message that names the cause and the JAR option and keep the source readable when the bundled engine cannot draw it.

### Preserved stakeholder intent

Writers expect PlantUML to work from the first preview, without Java, Graphviz, a JAR, a process or network access. They expect unchanged diagrams not to be redrawn when they edit nearby text or flip the theme, and a failed or unsupported diagram to say why and how to proceed, never to disappear.

### Rationale and constraints

- Reading: `plantuml` fences and `{plantuml}` or `{uml}` directives with a body produce a diagram labelled "PlantUML diagram", with the source in a collapsed "Diagram source" disclosure. The `@startuml` wrapper is the writer's; the extension adds none.
- The default engine is bundled and runs in the preview page: it starts no process, reads no executable or JAR, sends nothing over the network, and works in Restricted Mode. Its script is loaded only when the page has a PlantUML diagram and runs under the unchanged Content Security Policy.
- Pictures use light text on a dark preview and dark text on a light one, decided from the page background; a switch between light and dark draws every diagram again. The picture is inert and is centred and contained in the content width.
- The bundled `!theme` library and the OpenIconic `<&icon>` sprites work offline. Known issue: class-like diagrams use PlantUML's own Smetana layout instead of Graphviz, so some layouts differ from the JAR output.
- The engine ships pinned to an exact version of `@plantuml/core` (versions before 1.2026.6 are GPL) and its licence is packaged with it. An engine upgrade can change drawing output.
- Typing: bundled-engine pictures are kept by source, include base and light/dark variant (64 most recent); results with a refused include, or with an unsupported directive in an included file, are not kept and are asked again next time. Known issue: a plain engine failure (for example a syntax error) is kept until the source or the variant changes. The engine draws one diagram at a time, and a render superseded by a newer one of the same element does not overwrite it.
- After a content patch only the diagrams without a render state are drawn. Known issue: the page-side event wiring and the 64-entry eviction have no unit test; only the visual campaign covers them.
- Failure: a diagram using `!includeurl`, `!include https://...`, a `!include` of a standard-library name in angle brackets, `!includedef`, `!import` or `!theme ... from` shows one message naming the directive and its line, and the JAR option hint. The engine does not run. The directive is matched at line start only; one placed after text on a line falls under the generic failure message.
- The engine's loaders refuse standard-library bundles, optional scripts such as emoji, a `!theme` read from a folder, any local file when no host is connected, and a URL or library directive inside an included file; nothing is fetched. An emoji refusal appears as the generic failure message.
- When the engine fails (syntax error or exception) the diagram reads "The built-in PlantUML engine could not render this diagram: followed by the reason", the reason as plain text without a Java-style class prefix, with the JAR option hint, no picture, and the source kept. Known issue: no diagnostic reaches the status line; only the picture area shows the message.
- A source longer than 1 MiB is refused before the engine runs with "The PlantUML source exceeds the 1 MiB preview limit."
- Known issue: a diagram with empty source is skipped and left blank.
