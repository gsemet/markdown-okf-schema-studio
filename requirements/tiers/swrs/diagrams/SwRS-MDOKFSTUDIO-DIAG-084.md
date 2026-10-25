---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-084
uuid: 777fec0c-2d08-4697-abf5-7cef2c87162e
title: The JAR pipeline runs java or plantuml once per diagram on stdin
description: When useJar is true in a trusted workspace, the extension SHALL
  render each PlantUML diagram by starting its own process in the workspace
  folder, java with the arguments -jar, the resolved JAR path, -pipe and -tsvg
  when jarPath is not empty and the plantuml command with -pipe and -tsvg
  otherwise, writing the diagram text to its standard input and taking as the
  picture the output from the first svg start tag to the last svg end tag.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-007
depends_on:
- SwRS-MDOKFSTUDIO-DIAG-024
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/configuration/plantUmlConfiguration.ts
- src/core/render/plantUmlRenderer.ts
tested_in_files:
- test/core/configuration/plantUmlConfiguration.test.ts
- test/core/render/diagReq.jar.requirements.test.ts
- test/core/render/plantUmlRenderer.test.ts
---

## The JAR pipeline runs java or plantuml once per diagram on stdin

### Normative behavior

When useJar is true in a trusted workspace, the extension SHALL render each PlantUML diagram by starting its own process in the workspace folder, java with the arguments -jar, the resolved JAR path, -pipe and -tsvg when jarPath is not empty and the plantuml command with -pipe and -tsvg otherwise, writing the diagram text to its standard input and taking as the picture the output from the first svg start tag to the last svg end tag.

### Scenario (nominal): JAR configured
- GIVEN useJar true, a trusted workspace and an existing JAR path
- WHEN a preview with a PlantUML diagram is rendered
- THEN the process started is java with the arguments -jar, the JAR path, -pipe, -tsvg

### Scenario (nominal): PATH command
- GIVEN useJar true, a trusted workspace and an empty jarPath
- WHEN a preview with a PlantUML diagram is rendered
- THEN the process started is plantuml with the arguments -pipe and -tsvg

### Scenario (boundary): Reading and resolving jarPath
| Input | Outcome |
| --- | --- |
| jarPath of two spaces, a path and a tab | the result is the path without the padding |
| jarPath holding only spaces | the setting reads as empty and the plantuml command is used instead |
| jarPath holding a number (not a string) | the result is the empty string |
| Relative jarPath tools/plantuml.jar with a workspace folder | java is given the JAR path inside the workspace folder |
| Absolute jarPath | java is given that path unchanged |

### Scenario (refusal): Command missing
- GIVEN no plantuml command on the PATH
- WHEN a preview is rendered
- THEN the diagram shows the executable-not-found message

### Scenario (nominal): Text on standard input, workspace folder as working directory
- GIVEN a diagram with some text, the JAR pipeline and a workspace folder open in the editor
- WHEN the process is started
- THEN the process standard input receives exactly the diagram text and its working directory is the workspace root

### Scenario (nominal): The picture is the SVG span of the output
- GIVEN a process that prints log lines before and after the SVG, or a multibyte character split across two output chunks
- WHEN the output is read
- THEN the picture is the SVG only, the log lines are ignored and the character is decoded correctly

### Scenario (boundary): One process per diagram
- GIVEN three PlantUML diagrams
- WHEN the preview is rendered
- THEN three processes are started before any finishes

- GIVEN a document without PlantUML diagrams
- WHEN the preview is rendered
- THEN no process starts and the result is empty

### Known issues

- Known issue: The JAR and PATH pipeline asks for no dark variant, so its picture is the same in the light and dark preview.
- Known issue: The renderer has an executablePath option that no setting feeds; only visual fixtures pass it, so users cannot change the command name.
- Known issue: Many diagrams start many JVMs at once.

### Related requirements

- SwRS-MDOKFSTUDIO-DIAG-024: the settings that choose the engine
- SwRS-MDOKFSTUDIO-DIAG-105: how the results replace the diagrams of the render
- SwRS-MDOKFSTUDIO-DIAG-089: how a failure is reported
- SwRS-MDOKFSTUDIO-DIAG-097: the bounds of a JAR render

### Verification notes

- Method: test/core/render/plantUmlRenderer.test.ts (renders PlantUML through the configured external JAR and injects an image: JAR configured, relative path, stdin and working directory, SVG span; uses the PATH executable when no JAR is configured and reports missing commands: PATH command, command missing; decodes a multibyte character split across stdout chunks: split characters).
- Method: test/core/configuration/plantUmlConfiguration.test.ts (reads and trims the configured PlantUML JAR path; uses an empty path for non-string configuration values: boundary rows for padding and non-string).
- Method: test/core/render/diagReq.jar.requirements.test.ts (`the JAR pipeline starts one process per diagram before any of them finishes`: one process per diagram).
- Criteria: The spawned command and arguments match; the picture equals the SVG span; trim and empty fallback hold; the resolved path equals the workspace folder joined with the setting; input on stdin and cwd is the workspace folder; process count equals diagram count. The blank-path row and the empty-document case are checked only through these tests, with no test of their own.
