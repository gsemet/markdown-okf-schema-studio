---
type: StRS
id: StRS-MDOKFSTUDIO-DIAG-009
uuid: 3b309e6b-538b-49b1-ba2b-aaf1e6c1c800
title: PlantUML diagrams use local include files and PUML files
description: When a bundled-engine diagram includes local files or a document
  references a PlantUML file with the uml or plantuml directive, the Studio
  SHALL read them under the workspace rules, draw the assembled diagram, redraw
  it when the files change, stop at fixed limits and explain why a file cannot
  be read.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: proposed
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I split a diagram into include files or keep it in a
  separate puml file, and the preview shows the assembled picture and follows my
  edits to those files.
derived_by:
- SwRS-MDOKFSTUDIO-DIAG-039
- SwRS-MDOKFSTUDIO-DIAG-042
- SwRS-MDOKFSTUDIO-DIAG-045
- SwRS-MDOKFSTUDIO-DIAG-046
- SwRS-MDOKFSTUDIO-DIAG-047
- SwRS-MDOKFSTUDIO-DIAG-048
- SwRS-MDOKFSTUDIO-DIAG-049
- SwRS-MDOKFSTUDIO-DIAG-050
- SwRS-MDOKFSTUDIO-DIAG-051
- SwRS-MDOKFSTUDIO-DIAG-052
- SwRS-MDOKFSTUDIO-DIAG-053
- SwRS-MDOKFSTUDIO-DIAG-054
- SwRS-MDOKFSTUDIO-DIAG-055
- SwRS-MDOKFSTUDIO-DIAG-056
- SwRS-MDOKFSTUDIO-DIAG-057
- SwRS-MDOKFSTUDIO-DIAG-058
- SwRS-MDOKFSTUDIO-DIAG-059
- SwRS-MDOKFSTUDIO-DIAG-060
- SwRS-MDOKFSTUDIO-DIAG-061
- SwRS-MDOKFSTUDIO-DIAG-062
- SwRS-MDOKFSTUDIO-DIAG-063
- SwRS-MDOKFSTUDIO-DIAG-064
- SwRS-MDOKFSTUDIO-DIAG-065
- SwRS-MDOKFSTUDIO-DIAG-066
- SwRS-MDOKFSTUDIO-DIAG-067
- SwRS-MDOKFSTUDIO-DIAG-068
- SwRS-MDOKFSTUDIO-DIAG-069
- SwRS-MDOKFSTUDIO-DIAG-070
- SwRS-MDOKFSTUDIO-DIAG-071
- SwRS-MDOKFSTUDIO-DIAG-072
- SwRS-MDOKFSTUDIO-DIAG-073
- SwRS-MDOKFSTUDIO-DIAG-074
- SwRS-MDOKFSTUDIO-DIAG-113
- SwRS-MDOKFSTUDIO-DIAG-114
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-TRUST-090
default_owner_email: gaetan@xeberon.net
supersedes:
- StRS-MDOKFSTUDIO-DIAG-011
---

## PlantUML diagrams use local include files and PUML files

### Normative behavior

When a bundled-engine diagram includes local files or a document references a PlantUML file with the uml or plantuml directive, the Studio SHALL read them under the workspace rules, draw the assembled diagram, redraw it when the files change, stop at fixed limits and explain why a file cannot be read.

### Preserved stakeholder intent

Writers who split diagrams into files expect the preview to assemble them, follow their edits and not read anything it should not. Writers who store diagrams in `.puml` files expect to reference them from a document and see them drawn, with clear messages when a file cannot be used.

### Rationale and constraints

- Includes: a local `!include`, `!include_many`, `!include_once` or `!includesub` is read through the extension. A top-level include resolves next to the document, or next to the `.puml` file of a `{uml}` diagram; a nested include resolves next to the including file. No network request is made.
- The host answers only a well-formed request (file name non-blank and at most 4096 characters) for the current document; a page one render behind is still answered. It follows the `{include}` rules: URLs and library names are never read, and a trusted workspace serves the workspace while Restricted Mode serves only the document's folder and below.
- An answer is matched to its request; a refusal, a 10 s timeout or a missing host connection shows its reason in the diagram. A diagram includes at most 8 files deep, 64 files, and 1 MiB of text in all; an include cycle stops with a message naming the file.
- When a file the engine read changes on disk, the diagrams that read files are drawn again, after an open block editor closes. The remembered files are bounded at 1024 and cleared when the preview follows another document.
- A diagram in an included document and a `{uml}` file resolve their own includes next to that file.
- PUML files: `{uml} path.puml` and a body-less `{plantuml} path.puml` draw the diagram stored in that file; its text is the diagram and the expandable source. The file is a render dependency: editing it re-renders the preview. With the JAR option the JAR receives the file text.
- A file that cannot be read is replaced by a message and one warning in the status line: not found (and watched, so the diagram appears once the file is created), outside the workspace (or the document's folder in Restricted Mode), an absolute path or URL ("must be a relative path"), or too large. An include cycle is an engine-side include message and posts no status-line warning. Known issue: the "too large" and "budget exhausted" messages are not triggered by any test in this scope.
