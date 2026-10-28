---
type: StRS
id: StRS-MDOKFSTUDIO-DIAG-012
uuid: 0558b572-e891-4360-b1af-b5f72eaf118e
title: Render PlantUML with my own JAR or command
description: When the JAR option is on in a trusted workspace, the Studio SHALL
  draw each PlantUML diagram with the configured JAR or the plantuml command and
  show the result in the open preview.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: StRS
annotation_exemption: true
exemption_reason: "Superseded by StRS-MDOKFSTUDIO-DIAG-007; no marker expected."
derives_from: []
user_need: As a writer with a PlantUML installation, I use its exact output,
  including features the bundled engine lacks.
derived_by: []
superseded_by: StRS-MDOKFSTUDIO-DIAG-007
default_owner_email: gaetan@xeberon.net
---

## Render PlantUML with my own JAR or command

### Normative behavior

When the JAR option is on in a trusted workspace, the Studio SHALL draw each PlantUML diagram with the configured JAR or the plantuml command and show the result in the open preview.

### Preserved stakeholder intent

Writers with a PlantUML installation expect its exact output, including features the bundled engine lacks such as remote includes.

As a writer with a PlantUML installation, I use its exact output, including features the bundled engine lacks.

### Rationale and constraints

- With `useJar` on in a trusted workspace, a diagram is rendered by `java -jar <jar> -pipe -tsvg` when `jarPath` is set, or by `plantuml -pipe -tsvg` when it is empty. The source goes in on standard input in the workspace folder and the SVG is taken from the output; log lines around it are ignored.
- `jarPath` is trimmed, and a relative path is resolved from the workspace folder; a non-string value reads as empty.
- With several diagrams, one process is started per diagram in parallel; each result is matched to its diagram in document order, and one failure does not affect the others.
- Results reach the open preview in place when ready: pictures with a rendered state, failures as a red message paragraph plus a status-line warning with code `plantuml-render`. A save, a PlantUML result or a link update waits for an open block edit to finish.
- Known issue: the `executablePath` option of the renderer is fed by no setting; only visual fixtures pass it. The success visual scenario fails when `plantuml` is not on the PATH, and many diagrams mean many JVMs at once.
