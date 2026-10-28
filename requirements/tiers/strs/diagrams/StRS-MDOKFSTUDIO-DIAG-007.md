---
type: StRS
id: StRS-MDOKFSTUDIO-DIAG-007
uuid: 1247ef56-cfef-408e-ae74-0a5c1074a2c3
title: A writer renders PlantUML with an own JAR or command, safely bounded
description: When a writer sets the PlantUML options, the Studio SHALL draw with
  the bundled engine by default, or with the writer's own Java JAR or PlantUML
  command only when the JAR option is on and the workspace is trusted, name the
  cause on the diagram when that rendering is blocked or fails, and stop a
  diagram that is too large, too slow, too chatty or cancelled.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: proposed
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I decide whether PlantUML runs in the safe bundled
  engine or in my own installation, changing the choice applies to open
  previews, and a blocked, failing or heavy diagram never freezes the editor or
  leaves processes running.
derived_by:
- SwRS-MDOKFSTUDIO-DIAG-024
- SwRS-MDOKFSTUDIO-DIAG-025
- SwRS-MDOKFSTUDIO-DIAG-026
- SwRS-MDOKFSTUDIO-DIAG-027
- SwRS-MDOKFSTUDIO-DIAG-032
- SwRS-MDOKFSTUDIO-DIAG-054
- SwRS-MDOKFSTUDIO-DIAG-057
- SwRS-MDOKFSTUDIO-DIAG-075
- SwRS-MDOKFSTUDIO-DIAG-076
- SwRS-MDOKFSTUDIO-DIAG-077
- SwRS-MDOKFSTUDIO-DIAG-078
- SwRS-MDOKFSTUDIO-DIAG-082
- SwRS-MDOKFSTUDIO-DIAG-084
- SwRS-MDOKFSTUDIO-DIAG-085
- SwRS-MDOKFSTUDIO-DIAG-086
- SwRS-MDOKFSTUDIO-DIAG-087
- SwRS-MDOKFSTUDIO-DIAG-088
- SwRS-MDOKFSTUDIO-DIAG-089
- SwRS-MDOKFSTUDIO-DIAG-090
- SwRS-MDOKFSTUDIO-DIAG-091
- SwRS-MDOKFSTUDIO-DIAG-092
- SwRS-MDOKFSTUDIO-DIAG-093
- SwRS-MDOKFSTUDIO-DIAG-094
- SwRS-MDOKFSTUDIO-DIAG-095
- SwRS-MDOKFSTUDIO-DIAG-096
- SwRS-MDOKFSTUDIO-DIAG-097
- SwRS-MDOKFSTUDIO-DIAG-098
- SwRS-MDOKFSTUDIO-DIAG-099
- SwRS-MDOKFSTUDIO-DIAG-100
- SwRS-MDOKFSTUDIO-DIAG-101
- SwRS-MDOKFSTUDIO-DIAG-102
- SwRS-MDOKFSTUDIO-DIAG-103
- SwRS-MDOKFSTUDIO-DIAG-104
- SwRS-MDOKFSTUDIO-DIAG-105
- SwRS-MDOKFSTUDIO-DIAG-106
- SwRS-MDOKFSTUDIO-DIAG-107
- SwRS-MDOKFSTUDIO-DIAG-108
- SwRS-MDOKFSTUDIO-DIAG-109
- SwRS-MDOKFSTUDIO-DIAG-110
- SwRS-MDOKFSTUDIO-DIAG-111
- SwRS-MDOKFSTUDIO-DIAG-117
- SwRS-MDOKFSTUDIO-DIAG-118
- SwRS-MDOKFSTUDIO-DIAG-120
default_owner_email: gaetan@xeberon.net
supersedes:
- StRS-MDOKFSTUDIO-DIAG-012
- StRS-MDOKFSTUDIO-DIAG-013
- StRS-MDOKFSTUDIO-DIAG-014
---

## A writer renders PlantUML with an own JAR or command, safely bounded

### Normative behavior

When a writer sets the PlantUML options, the Studio SHALL draw with the bundled engine by default, or with the writer's own Java JAR or PlantUML command only when the JAR option is on and the workspace is trusted, name the cause on the diagram when that rendering is blocked or fails, and stop a diagram that is too large, too slow, too chatty or cancelled.

### Preserved stakeholder intent

Writers and security-minded teams expect to choose between a safe bundled engine and their own PlantUML installation, and expect a change of choice to take effect at once. Writers with an installation expect its exact output, including features the bundled engine lacks such as remote includes, and expect a blocked or failing render to name its cause, with Restricted Mode as a hard stop. They expect a heavy, hung or abandoned diagram not to freeze the editor or leave processes behind.

### Rationale and constraints

- Choice: the JAR option is off by default. Only a real `true` selects the JAR pipeline; a non-boolean value never starts a process. In an untrusted workspace the option still routes to the JAR pipeline, which refuses without starting a process.
- The JAR path option is used only when the JAR option is on and is kept, ignored, while it is off.
- Changing any PlantUML setting re-reads the settings of every open preview and renders the open document again, without reopening the preview.
- Both settings are explained in the Settings UI, in a "PlantUML" category (order 5), each with a unique order and a description of its effect.
- Known issue: when the renderer is called without an engine option it defaults to the JAR pipeline; only the VS Code session passes the bundled engine.
- Rendering: with the JAR option on in a trusted workspace, a diagram is rendered by `java -jar <jar> -pipe -tsvg` when the JAR path is set, or by `plantuml -pipe -tsvg` when it is empty. The source goes in on standard input in the workspace folder and the SVG is taken from the output; log lines around it are ignored.
- The JAR path is trimmed, and a relative path is resolved from the workspace folder; a non-string value reads as empty.
- With several diagrams, one process is started per diagram in parallel; each result is matched to its diagram in document order, and one failure does not affect the others.
- Results reach the open preview in place when ready: pictures with a rendered state, failures as a red message paragraph plus a status-line warning with code `plantuml-render`. A save, a PlantUML result or a link update waits for an open block edit to finish.
- Known issue: the executable path option of the renderer is fed by no setting; only visual fixtures pass it. The success visual scenario fails when `plantuml` is not on the PATH, and many diagrams mean many JVMs at once.
- Blocked or failed: in Restricted Mode with the JAR option on, no process starts: every PlantUML diagram shows "PlantUML preview is disabled in an untrusted workspace." with one warning each. The bundled engine is not swapped in silently.
- A JAR path that does not exist shows "The PlantUML JAR could not be found: followed by the path"; a directory shows "The PlantUML JAR path is not a file: followed by the path"; no process starts. The diagram state is `error`.
- A missing `plantuml` command shows `PlantUML executable "plantuml" was not found on PATH. Set markdownOkfSchemaStudio.plantuml.jarPath to a valid JAR path.` with the source kept and the state `unavailable`. Known issue: a missing Java gives the same wording about the executable "java", which does not name Java or Graphviz and misleads when the JAR path is already set; a missing Graphviz is neither checked nor reported.
- A process exiting with an error shows `PlantUML exited with code N: followed by the error output` (or `signal S`, or "PlantUML returned no diagnostic."); output without `<svg` shows "PlantUML did not return SVG output."; a spawn that throws is reported the same way. A process that exits before reading its input, or a stdin error, becomes a normal message instead of crashing the extension host.
- Bounds: a source over 1 MiB is refused before spawning ("PlantUML source exceeds the 1 MiB preview limit."); an SVG output over 8 MiB kills the process ("PlantUML SVG output exceeds the 8 MiB preview limit.").
- A render over 30 s is stopped, the whole process group killed, with "PlantUML did not finish within 30 s."
- Error text from a process is capped at 64 KiB with "[stderr truncated at 64 KiB]".
- Cancelling a render (a newer render stage, the preview closing) sends SIGTERM to the whole process group on POSIX, falling back to the direct child; an exited child is not signalled. A render that sees close, error and timeout together settles once. Known issue: Windows, which has no process group, is untested.
