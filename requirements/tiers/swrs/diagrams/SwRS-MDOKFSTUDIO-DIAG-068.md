---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-068
uuid: c243155e-1061-4502-b5b2-cc12b3494d49
title: "A {uml} directive renders a PUML file as a render dependency"
description: "When a {uml} directive or a {plantuml} directive without a body names
  a file, the extension SHALL render the diagram stored in that file, using the file
  text as the diagram and as the expandable source and recording the file name on
  the diagram element, record the file as a dependency of the render, or show the
  reason it cannot be read in place of the diagram."
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-009
depends_on:
- SwRS-MDOKFSTUDIO-DIAG-054
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/mystNormalize.ts
- src/core/render/mystRenderer.ts
tested_in_files:
- test/core/render/diagReq.pipeline.requirements.test.ts
- test/core/render/plantUmlFile.test.ts
- test/page/modules/plantumlDiagram.test.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-DIAG-069
- SwRS-MDOKFSTUDIO-DIAG-070
- SwRS-MDOKFSTUDIO-DIAG-071
- SwRS-MDOKFSTUDIO-DIAG-072
- SwRS-MDOKFSTUDIO-DIAG-073
- SwRS-MDOKFSTUDIO-DIAG-074
---

## A {uml} directive renders a PUML file as a render dependency

### Normative behavior

When a {uml} directive or a {plantuml} directive without a body names a file, the extension SHALL render the diagram stored in that file, using the file text as the diagram and as the expandable source and recording the file name on the diagram element, record the file as a dependency of the render, or show the reason it cannot be read in place of the diagram.

### Scenario (nominal): File diagram
- GIVEN a {uml} directive and a {plantuml} directive without a body, both naming diagrams/flow.puml
- WHEN the preview is rendered
- THEN both figures hold the file text as diagram and source, with data-plantuml-file equal to diagrams/flow.puml and data-plantuml-base equal to the file's real path

### Scenario (boundary): Options only
- GIVEN a {plantuml} directive whose body holds only a :caption: option
- WHEN the preview is rendered
- THEN it is treated as body-less, the file is rendered and the caption is not shown

### Scenario (nominal): Dependency
- GIVEN a {uml} directive naming an existing file
- WHEN the preview is rendered
- THEN the file's real path is in the render dependencies

- GIVEN a {plantuml} directive with a body
- WHEN the preview is rendered
- THEN no file dependency is recorded for it

### Scenario (refusal): Files that are not read
The refusal message replaces the diagram, no diagram figure is produced and one warning is reported for the line.

| Input | Outcome |
| --- | --- |
| Path outside the allowed folders (outside the workspace; Restricted Mode keeps to the document's folder) | a message says the file is outside the folders the preview reads |
| Absolute path or URL | the message says the path must be a relative path to a local file |
| File larger than 5 MiB | the message says the file is larger than the 5 MiB preview limit |

### Scenario (refusal): Missing file
- GIVEN a {uml} directive naming diagrams/later.puml that does not exist
- WHEN the preview is rendered
- THEN the message PlantUML file not found: diagrams/later.puml. appears with a warning on line 1 and the missing path is a dependency

- GIVEN the file is created afterwards
- WHEN the preview renders again
- THEN the diagram appears

### Scenario (refusal): Budget exhausted
- GIVEN a render whose include budget is used up and a {uml} directive after it, or two such directives
- WHEN the preview is rendered
- THEN each diagram is replaced by the message that the file was not read because the include budget of this render is exhausted, and only one budget warning is reported for the render

### Scenario (boundary): Directives without file or body
| Input | Outcome |
| --- | --- |
| {uml} with no argument and no body | the message The {uml} directive needs a diagram file path or a diagram body. appears in place of the diagram and a warning is reported |
| {plantuml} with no argument and no body | no such message; the diagram is an empty figure |

### Scenario (nominal): Include base of nested diagrams
A diagram that comes from an included document or from a {uml} file resolves its !include lines next to that file.

| Input | Outcome |
| --- | --- |
| plantuml fence in a document included by {include} | data-plantuml-base equal to the included document |
| {uml} diagram in an included document | data-plantuml-base equal to its own file |
| plantuml fence in the previewed document itself | no data-plantuml-base; includes resolve next to the document |

### Known issues

- Known issue: Directive options such as :caption: are accepted but not shown.
- Known issue: The too-large message is written in code but no test triggers it.

### Related requirements

- SwRS-MDOKFSTUDIO-DIAG-054: the include rules that a diagram file follows
- SwRS-MDOKFSTUDIO-DIAG-046: how the page asks for the include files of a diagram
- SwRS-MDOKFSTUDIO-DIAG-053: the host watch of include files

### Verification notes

- Method: test/core/render/plantUmlFile.test.ts (`{uml} path.puml and a body-less {plantuml} path.puml render the file, name it and depend on it`: file diagram, options only, dependency; a missing diagram file shows a clear message, is reported and is watched for its creation: missing file; a diagram file outside the bounds is refused like an {include}: outside folders and absolute path; a {uml} directive with neither a file nor a body says so: empty directives; in an included document, {uml} resolves next to it and inline diagrams take it as their include base: include base; with useJar the JAR receives the text of the {uml} file). The too-large row is untested.
- Method: test/core/render/diagReq.pipeline.requirements.test.ts (`after the include budget is exhausted every remaining diagram file shows the budget message, with one warning`: budget scenario).
- Method: test/page/modules/plantumlDiagram.test.ts (the top-level includes of a {uml} diagram file resolve next to that file: include base scenario).
- Method: test/visual/scenarioDefinitions2.ts (visual scenarios diagrams v13 and v14: two pictures, no network, file diagram scenario).
- Criteria: File text appears as diagram and source (with useJar the JAR receives the file text); an inline body keeps its own text; dependencies list exactly the files read; message, warning and no diagram figure for a refusal; the message uses the PlantUML error style and the missing path is watched; only {uml} gets the empty-directive message; the base attribute names the right file.
