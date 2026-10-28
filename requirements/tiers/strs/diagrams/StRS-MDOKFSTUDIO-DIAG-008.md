---
type: StRS
id: StRS-MDOKFSTUDIO-DIAG-008
uuid: a8f68e1d-c525-48cf-a4da-0cac128e52bd
title: Understand why a bundled PlantUML diagram is not drawn
description: When a writer previews a diagram the bundled engine cannot draw,
  the Studio SHALL show a message that names the cause and the JAR option, and
  keep the source readable.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I learn why my diagram has no picture and what to
  change, instead of seeing a blank block.
derived_by: []
superseded_by:
- StRS-MDOKFSTUDIO-DIAG-006
default_owner_email: gaetan@xeberon.net
---

## Understand why a bundled PlantUML diagram is not drawn

### Normative behavior

When a writer previews a diagram the bundled engine cannot draw, the Studio SHALL show a message that names the cause and the JAR option, and keep the source readable.

### Preserved stakeholder intent

Writers expect a failed or unsupported diagram to say why and how to proceed, never to disappear.

As a writer, I learn why my diagram has no picture and what to change, instead of seeing a blank block.

### Rationale and constraints

- A diagram using `!includeurl`, `!include https://...`, a `!include` of a standard-library name in angle brackets, `!includedef`, `!import` or `!theme ... from` shows one message naming the directive and its line, and the `markdownOkfSchemaStudio.plantuml.useJar` hint. The engine does not run. The directive is matched at line start only; one placed after text on a line falls under the generic failure message.
- The engine's loaders refuse standard-library bundles, optional scripts such as emoji, a `!theme` read from a folder, any local file when no host is connected, and a URL or library directive inside an included file; nothing is fetched. An emoji refusal appears as the generic failure message.
- When the engine fails (syntax error or exception) the diagram reads "The built-in PlantUML engine could not render this diagram: followed by the reason", the reason as plain text without a Java-style class prefix, with the `useJar` hint, no picture, and the source kept. Known issue: no diagnostic reaches the status line; only the picture area shows the message.
- A source longer than 1 MiB is refused before the engine runs with "The PlantUML source exceeds the 1 MiB preview limit."
- Known issue: a diagram with empty source is skipped and left blank.
