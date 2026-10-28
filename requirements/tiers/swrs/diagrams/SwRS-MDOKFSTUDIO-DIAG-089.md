---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-089
uuid: c41362bf-7600-4e4d-a229-f6f435c41601
title: JAR failures are reported on the diagram and in the status line
description: When the JAR pipeline cannot draw a PlantUML diagram, the extension
  SHALL show on that diagram the message of the cause with the state error or
  unavailable, and report a warning with the code plantuml-render and the
  document path in addition to the message on the diagram.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-007
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/plantUmlRenderer.ts
- src/session/features/plantUml.ts
tested_in_files:
- test/core/render/diagReq.jar.requirements.test.ts
- test/core/render/plantUmlEngine.test.ts
- test/core/render/plantUmlRenderer.test.ts
- test/session/diagReq.plantuml.requirements.test.ts
- test/visual/scenarioDefinitions1.ts
default_owner_email: gaetan@xeberon.net
---

## JAR failures are reported on the diagram and in the status line

### Normative behavior

When the JAR pipeline cannot draw a PlantUML diagram, the extension SHALL show on that diagram the message of the cause with the state error or unavailable, and report a warning with the code plantuml-render and the document path in addition to the message on the diagram.

### Scenario (nominal): An existing JAR file is run
- GIVEN jarPath naming a regular file
- WHEN the preview is rendered
- THEN the JAR is run
- AND when every diagram is rendered no PlantUML warning is reported

### Scenario (refusal): The jarPath does not exist
- GIVEN jarPath naming missing.jar and two PlantUML diagrams
- WHEN the preview is rendered
- THEN both diagrams show The PlantUML JAR could not be found followed by the resolved path, with state error, and no process starts

### Scenario (refusal): The jarPath is a directory
- GIVEN jarPath naming a directory
- WHEN the preview is rendered
- THEN every diagram shows The PlantUML JAR path is not a file followed by the path, with state error, and no process starts

### Scenario (refusal): Restricted Mode disables the JAR pipeline
- GIVEN an untrusted workspace, useJar true and two PlantUML diagrams
- WHEN the preview is rendered
- THEN both diagrams show PlantUML preview is disabled in an untrusted workspace. with state unavailable and no process starts

### Scenario (refusal): The command to run is missing
| Input | Outcome |
| --- | --- |
| useJar true, an empty jarPath and no plantuml command on the PATH | the diagram shows PlantUML executable "plantuml" was not found on PATH. Set markdownOkfSchemaStudio.plantuml.jarPath to a valid JAR path. with state unavailable, shows no picture and keeps its source disclosure |
| the renderer called with an absolute executable path that does not exist | the message omits on PATH |
| useJar true, jarPath set to a valid JAR and no java on the PATH | the diagram shows PlantUML executable "java" was not found on PATH. Set markdownOkfSchemaStudio.plantuml.jarPath to a valid JAR path. with state unavailable |
| java found but not executable (any spawn error other than a missing command) | the diagram shows the system error text with state error |
| the spawn call throws an error with a message | the diagram shows that message with state error and a warning |
| the spawn call throws a not-found error | the diagram shows the missing-executable message with state unavailable |

### Scenario (refusal): The process fails or returns no picture
| Input | Outcome |
| --- | --- |
| a process that exits with code 1 and error output Syntax Error | the diagram shows PlantUML exited with code 1: Syntax Error with state error |
| a process that exits with code 2 and no error output | the diagram shows PlantUML exited with code 2: PlantUML returned no diagnostic. |
| a process that ends on a signal S | the diagram shows PlantUML exited with signal S followed by a colon and the error output or PlantUML returned no diagnostic., with state error |
| a process that exits 0 and prints plain text | the diagram shows PlantUML did not return SVG output. with state error |
| output with an svg start tag and no end tag | the same message appears |

### Scenario (boundary): Each failure is also a status-line warning
| Input | Outcome |
| --- | --- |
| a missing JAR, a disabled workspace, a missing command and a failing process, one per diagram | the status line gets one warning with code plantuml-render and the document path per failing diagram |
| all diagrams rendered | no PlantUML warning is reported |
| a document without PlantUML diagrams, with any jarPath or in an untrusted workspace | nothing is reported: no message and no warning |

### Known issues
- Known issue: The visual campaign has no Restricted Mode PlantUML scenario.
- Known issue: The visual scenarios call renderPlantUmlDiagrams with an unlikely executablePath and not through useJar; the absolute executable path case is reachable only that way.
- Known issue: The message asks the user to set jarPath but not to also turn useJar on.
- Known issue: The missing java hint tells the user to set jarPath although it is already set; nothing names Java, and a missing Graphviz is neither checked nor reported.
- Known issue: The signal wording is untested.

### Related requirements
- SwRS-MDOKFSTUDIO-DIAG-024: the useJar and jarPath settings that choose the JAR pipeline.
- SwRS-MDOKFSTUDIO-DIAG-084: how the JAR pipeline runs one process per diagram.
- SwRS-MDOKFSTUDIO-DIAG-097: the bounds that also end a JAR render with a message.

### Verification notes
- Method: test/core/render/plantUmlRenderer.test.ts (uses the PATH executable when no JAR is configured and reports missing commands; missing JAR, missing command, absolute executable path, Restricted Mode with the untrusted case; returns diagnostics for PlantUML process failures and malformed output: exit code, no output, no SVG, unterminated SVG; the signal wording is untested).
- Method: test/core/render/diagReq.jar.requirements.test.ts `a jarPath naming a directory is refused on every diagram before any process starts`, `a missing java is reported like a missing command; other spawn errors keep their text`, `a spawn call that throws is reported on the diagram like any other failure` (directory and file, missing java, other spawn error, spawn throws).
- Method: test/core/render/plantUmlEngine.test.ts (useJar keeps the external pipeline; the built-in engine is not swapped in behind the user's back; Restricted Mode).
- Method: test/session/diagReq.plantuml.requirements.test.ts `each failing JAR diagram is also a plantuml-render warning with the document path` (warning per failure, no warning on success).
- Method: test/visual/scenarioDefinitions1.ts, visual scenarios diagrams v06 and v07 (missing command on the PATH, absolute executable path).
- Criteria: Exact message and state, no process for a refused path or a disabled workspace, one message per diagram, and one warning per failure.
