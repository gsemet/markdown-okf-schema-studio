---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-024
uuid: f3d430f9-7bab-4eff-8a0d-4b2449bd1792
title: The useJar and jarPath settings choose the PlantUML engine
description: When PlantUML diagrams are drawn, the extension SHALL select the
  built-in engine unless the setting markdownOkfSchemaStudio.plantuml.useJar is
  exactly true, and the JAR pipeline, which uses
  markdownOkfSchemaStudio.plantuml.jarPath, when it is true.
project: markdown-okf-schema-studio
scope: diagrams
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-006
- StRS-MDOKFSTUDIO-DIAG-007
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/configuration/plantUmlConfiguration.ts
- src/core/configuration/settingsRegistry.ts
- src/core/render/renderPipeline.ts
- src/page/modules/plantumlPreview.ts
- src/session/features/plantUml.ts
- src/session/hostEvents.ts
tested_in_files:
- test/core/configuration/plantUmlConfiguration.test.ts
- test/core/configuration/settingsRegistry.test.ts
- test/core/render/diagReq.pipeline.requirements.test.ts
- test/core/render/plantUmlEngine.test.ts
- test/security/package-contract.test.ts
- test/session/diagReq.settings.requirements.test.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-DIAG-025
- SwRS-MDOKFSTUDIO-DIAG-026
- SwRS-MDOKFSTUDIO-DIAG-027
- SwRS-MDOKFSTUDIO-DIAG-031
- SwRS-MDOKFSTUDIO-DIAG-075
- SwRS-MDOKFSTUDIO-DIAG-076
- SwRS-MDOKFSTUDIO-DIAG-077
- SwRS-MDOKFSTUDIO-DIAG-078
---

## The useJar and jarPath settings choose the PlantUML engine

### Normative behavior

When PlantUML diagrams are drawn, the extension SHALL select the built-in engine unless the setting markdownOkfSchemaStudio.plantuml.useJar is exactly true, and the JAR pipeline, which uses markdownOkfSchemaStudio.plantuml.jarPath, when it is true.

### Scenario (nominal): Default and true
- GIVEN the setting markdownOkfSchemaStudio.plantuml.useJar unset, then set to true in a trusted workspace
- WHEN a preview is rendered
- THEN when useJar is not exactly true the extension draws PlantUML diagrams with the built-in engine, and when it is true in a trusted workspace it selects the JAR pipeline
- AND the unset setting selects the built-in engine and true selects the JAR pipeline

### Scenario (refusal): Value that is not the boolean true
| Input | Outcome |
| --- | --- |
| useJar holding the text true | the built-in engine is selected and no process is started |
| useJar holding the number 1 | the built-in engine is selected and no process is started |

### Scenario (boundary): Trust of the workspace
| Input | Outcome |
| --- | --- |
| useJar true in an untrusted workspace | the JAR pipeline is still selected, which refuses to start a process; no diagram is drawn by the built-in engine and the choice never falls back to the built-in engine |
| useJar false in the same untrusted workspace | the built-in engine draws the diagrams |

### Scenario (nominal): The built-in engine starts no process
- GIVEN useJar off, in a trusted workspace with a jarPath set, and in an untrusted workspace
- WHEN a preview with PlantUML diagrams is rendered
- THEN no process is spawned and no PlantUML executable or JAR is read in either trust state
- AND in the trusted workspace the host reports no PlantUML diagram result, and in the untrusted workspace the diagrams are left to the page

### Scenario (nominal): The built-in engine needs nothing outside the extension
| Input | Outcome |
| --- | --- |
| a diagram that selects a theme of the bundled library and uses an OpenIconic icon | the picture is drawn and nothing is fetched |
| a class diagram on a machine without Graphviz | the picture is drawn with PlantUML's own Smetana layout, with no network access and no Graphviz installation |

### Scenario (boundary): jarPath is ignored until useJar is on
| Input | Outcome |
| --- | --- |
| jarPath holding a JAR path and useJar off | the built-in engine draws the diagrams and the JAR is neither checked nor started; the value is kept |
| the same jarPath after useJar is turned on and the preview is rendered again | the JAR pipeline uses that path without it being entered again |

### Scenario (nominal): A PlantUML setting change renders the open document again
| Input | Outcome |
| --- | --- |
| a change of plantuml.useJar (or any other markdownOkfSchemaStudio.plantuml setting) with a preview open | the preview settings are read again for every open preview and the document is rendered with the other engine, without reopening the preview |
| a change of a setting outside the preview, plantuml and frontmatter sections | nothing is re-read and nothing is rendered again |

### Scenario (boundary): The settings are contributed with an explanation
| Input | Outcome |
| --- | --- |
| the extension manifest, markdownOkfSchemaStudio.plantuml.useJar | a boolean with default false and order 79, with a Markdown description of the engine choice of at most 700 characters |
| the extension manifest, markdownOkfSchemaStudio.plantuml.jarPath | a string with an empty default and order 80, with a description of at most 700 characters that names useJar, the workspace folder and the PATH command (used only when useJar is on, relative to the workspace folder, empty for the plantuml command) |
| the orders of the other contributed settings | no other setting has order 79 |
| the categories of the settings registry | PlantUML is the fifth category (position 5) and holds useJar and jarPath |
| the manifest categories compared with the registry | titles and orders are equal |

### Known issues
- Known issue: PlantUmlController.engineFor has no host-level test.
- Known issue: When the renderer is called without an engine option it defaults to the JAR pipeline; only the VS Code session passes the built-in engine.
- Known issue: Smetana layouts can differ from the JAR output produced with Graphviz.
- Known issue: Untested: the bundled themes and sprites are registered by imports in plantumlPreview.ts.
- Known issue: The description of useJar still says the JAR is needed for !include files, although local includes now work in the built-in engine (the description is stale).

### Related requirements
- SwRS-MDOKFSTUDIO-DIAG-023: the fences and directives that the built-in engine draws
- SwRS-MDOKFSTUDIO-DIAG-084: the JAR pipeline that useJar selects
- SwRS-MDOKFSTUDIO-DIAG-089: the report of a jarPath that does not exist

### Verification notes
- Method: test/core/configuration/plantUmlConfiguration.test.ts (default and true, value that is not the boolean true, trust of the workspace)
- Method: test/core/render/plantUmlEngine.test.ts (default and true, value that is not the boolean true, trust of the workspace, built-in engine starts no process)
- Method: test/core/render/diagReq.pipeline.requirements.test.ts (jarPath is ignored until useJar is on)
- Method: test/visual/scenarioDefinitions2.ts, visual scenarios diagrams v10 and v11 (built-in engine starts no process: no network request, no Java)
- Method: test/session/diagReq.settings.requirements.test.ts (a PlantUML setting change reads the settings again and renders the open document again; an unrelated setting does nothing)
- Method: test/security/package-contract.test.ts (settings contributed with an explanation: type, default, unique order, description limit, category)
- Method: test/core/configuration/settingsRegistry.test.ts (category title and order)
- Method: untested: no test draws a themed or icon diagram or a class diagram without Graphviz (the scenario "The built-in engine needs nothing outside the extension" is to be checked by a visual scenario)
- Criteria: Only the boolean true leaves the built-in engine; jar-untrusted never becomes builtin; no spawn call and an empty host result in both trust states; the path takes effect only when useJar becomes true; only the three configured sections trigger a render; type, default, order, description limit, category title and order match the manifest.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-006](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-006.md): A writer reads PlantUML diagrams without any setup
  - [StRS-MDOKFSTUDIO-DIAG-007](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-007.md): A writer renders PlantUML with an own JAR or command, safely bounded
- Supersedes:
  - [SwRS-MDOKFSTUDIO-DIAG-025](SwRS-MDOKFSTUDIO-DIAG-025.md): useJar in an untrusted workspace keeps the JAR pipeline
  - [SwRS-MDOKFSTUDIO-DIAG-026](SwRS-MDOKFSTUDIO-DIAG-026.md): The built-in engine starts no process
  - [SwRS-MDOKFSTUDIO-DIAG-027](SwRS-MDOKFSTUDIO-DIAG-027.md): jarPath is ignored until useJar is on
  - [SwRS-MDOKFSTUDIO-DIAG-031](SwRS-MDOKFSTUDIO-DIAG-031.md): The built-in engine needs nothing outside the extension
  - [SwRS-MDOKFSTUDIO-DIAG-075](SwRS-MDOKFSTUDIO-DIAG-075.md): Changing a PlantUML setting renders the open document again
  - [SwRS-MDOKFSTUDIO-DIAG-076](SwRS-MDOKFSTUDIO-DIAG-076.md): The useJar setting is contributed with an explanation
  - [SwRS-MDOKFSTUDIO-DIAG-077](SwRS-MDOKFSTUDIO-DIAG-077.md): The jarPath setting is contributed with an explanation
  - [SwRS-MDOKFSTUDIO-DIAG-078](SwRS-MDOKFSTUDIO-DIAG-078.md): The PlantUML settings form their own category
<!-- okf:links:end -->
