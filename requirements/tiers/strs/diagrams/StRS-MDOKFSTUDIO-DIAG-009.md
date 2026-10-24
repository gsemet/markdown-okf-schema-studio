---
type: StRS
id: StRS-MDOKFSTUDIO-DIAG-009
uuid: 3b309e6b-538b-49b1-ba2b-aaf1e6c1c800
title: Use local include files in PlantUML diagrams
description: When a bundled-engine diagram includes local files, the Studio
  SHALL read them under the workspace rules, redraw the diagram when they
  change, and stop at fixed limits.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I split a diagram into include files and the preview
  shows the assembled picture and follows my edits to those files.
derived_by:
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
- SwRS-MDOKFSTUDIO-DIAG-074
- SwRS-MDOKFSTUDIO-DIAG-113
- SwRS-MDOKFSTUDIO-DIAG-114
---

## Use local include files in PlantUML diagrams

### Normative behavior

When a bundled-engine diagram includes local files, the Studio SHALL read them under the workspace rules, redraw the diagram when they change, and stop at fixed limits.

### Preserved stakeholder intent

Writers who split diagrams into files expect the preview to assemble them, follow their edits and not read anything it should not.

As a writer, I split a diagram into include files and the preview shows the assembled picture and follows my edits to those files.

### Rationale and constraints

- A local `!include`, `!include_many`, `!include_once` or `!includesub` is read through the extension. A top-level include resolves next to the document, or next to the `.puml` file of a `{uml}` diagram; a nested include resolves next to the including file. No network request is made.
- The host answers only a well-formed request (file name non-blank and at most 4096 characters) for the current document; a page one render behind is still answered. It follows the `{include}` rules: URLs and library names are never read, and a trusted workspace serves the workspace while Restricted Mode serves only the document's folder and below.
- An answer is matched to its request; a refusal, a 10 s timeout or a missing host connection shows its reason in the diagram. A diagram includes at most 8 files deep, 64 files, and 1 MiB of text in all; an include cycle stops with a message naming the file.
- When a file the engine read changes on disk, the diagrams that read files are drawn again, after an open block editor closes. The remembered files are bounded at 1024 and cleared when the preview follows another document.
- A diagram in an included document and a `{uml}` file resolve their own includes next to that file.
