---
type: StRS
id: StRS-MDOKFSTUDIO-DIAG-011
uuid: 81581f08-cd1d-4300-9790-4438214d6d49
title: Preview a diagram stored in a PUML file
description: When a writer references a PlantUML file with the uml or plantuml
  directive, the Studio SHALL draw that file's diagram, follow its changes, and
  explain why a file cannot be read.
project: markdown-okf-schema-studio
scope: diagrams
req_lifecycle: superseded
status: deprecated
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I keep diagrams in separate puml files, reference them
  from the document, and see them drawn.
derived_by: []
superseded_by:
- StRS-MDOKFSTUDIO-DIAG-009
default_owner_email: gaetan@xeberon.net
---

## Preview a diagram stored in a PUML file

### Normative behavior

When a writer references a PlantUML file with the uml or plantuml directive, the Studio SHALL draw that file's diagram, follow its changes, and explain why a file cannot be read.

### Preserved stakeholder intent

Writers who store diagrams in `.puml` files expect to reference them from a document and see them drawn, with clear messages when a file cannot be used.

As a writer, I keep diagrams in separate puml files, reference them from the document, and see them drawn.

### Rationale and constraints

- `{uml} path.puml` and a body-less `{plantuml} path.puml` draw the diagram stored in that file; its text is the diagram and the expandable source. The file is a render dependency: editing it re-renders the preview. With `useJar` the JAR receives the file text.
- A file that cannot be read is replaced by a message and one warning in the status line: not found (and watched, so the diagram appears once the file is created), outside the workspace (or the document's folder in Restricted Mode), an absolute path or URL ("must be a relative path"), or too large. An include cycle is an engine-side include message and posts no status-line warning. Known issue: the "too large" and "budget exhausted" messages are not triggered by any test in this scope.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Superseded by:
  - [StRS-MDOKFSTUDIO-DIAG-009](StRS-MDOKFSTUDIO-DIAG-009.md): PlantUML diagrams use local include files and PUML files
<!-- okf:links:end -->
