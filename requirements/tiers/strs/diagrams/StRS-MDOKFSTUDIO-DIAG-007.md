---
type: StRS
id: StRS-MDOKFSTUDIO-DIAG-007
uuid: 1247ef56-cfef-408e-ae74-0a5c1074a2c3
title: Choose how PlantUML diagrams are drawn
description: When a writer sets the PlantUML options, the Studio SHALL draw with
  the bundled engine by default, or with the writer's own Java JAR or PlantUML
  command only when the JAR option is on and the workspace is trusted.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I decide whether PlantUML runs in the safe bundled
  engine or in my own installation, and changing the choice applies to open
  previews.
derived_by:
- SwRS-MDOKFSTUDIO-DIAG-024
- SwRS-MDOKFSTUDIO-DIAG-025
- SwRS-MDOKFSTUDIO-DIAG-026
- SwRS-MDOKFSTUDIO-DIAG-027
- SwRS-MDOKFSTUDIO-DIAG-075
- SwRS-MDOKFSTUDIO-DIAG-076
- SwRS-MDOKFSTUDIO-DIAG-077
- SwRS-MDOKFSTUDIO-DIAG-078
---

## Choose how PlantUML diagrams are drawn

### Normative behavior

When a writer sets the PlantUML options, the Studio SHALL draw with the bundled engine by default, or with the writer's own Java JAR or PlantUML command only when the JAR option is on and the workspace is trusted.

### Preserved stakeholder intent

Writers and security-minded teams expect to choose between a safe bundled engine and their own PlantUML installation, and expect a change of choice to take effect at once.

As a writer, I decide whether PlantUML runs in the safe bundled engine or in my own installation, and changing the choice applies to open previews.

### Rationale and constraints

- `markdownOkfSchemaStudio.plantuml.useJar` is off by default. Only a real `true` selects the JAR pipeline; a non-boolean value never starts a process. In an untrusted workspace the option still routes to the JAR pipeline, which refuses without starting a process.
- `markdownOkfSchemaStudio.plantuml.jarPath` is used only when `useJar` is on and is kept, ignored, while it is off.
- Changing any `markdownOkfSchemaStudio.plantuml.*` setting re-reads the settings of every open preview and renders the open document again, without reopening the preview.
- Both settings are explained in the Settings UI, in a "PlantUML" category (order 5), each with a unique order and a description of its effect.
- Known issue: when the renderer is called without an engine option it defaults to the JAR pipeline; only the VS Code session passes the bundled engine.
