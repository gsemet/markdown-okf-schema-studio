---
type: StRS
id: StRS-MDOKFSTUDIO-DIAG-014
uuid: 307808fa-8dbc-41eb-ad51-9ad60e70fafc
title: A runaway PlantUML process cannot hang the preview
description: When a JAR-rendered diagram is too large, too slow, too chatty or
  cancelled, the Studio SHALL stop it and report the reason.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, a heavy or broken diagram never freezes the editor or
  leaves processes running.
derived_by:
- SwRS-MDOKFSTUDIO-DIAG-097
- SwRS-MDOKFSTUDIO-DIAG-098
- SwRS-MDOKFSTUDIO-DIAG-099
- SwRS-MDOKFSTUDIO-DIAG-100
- SwRS-MDOKFSTUDIO-DIAG-101
- SwRS-MDOKFSTUDIO-DIAG-102
- SwRS-MDOKFSTUDIO-DIAG-103
- SwRS-MDOKFSTUDIO-DIAG-118
---

## A runaway PlantUML process cannot hang the preview

### Normative behavior

When a JAR-rendered diagram is too large, too slow, too chatty or cancelled, the Studio SHALL stop it and report the reason.

### Preserved stakeholder intent

Writers expect that a heavy, hung or abandoned diagram cannot freeze the editor or leave processes behind.

As a writer, a heavy or broken diagram never freezes the editor or leaves processes running.

### Rationale and constraints

- A source over 1 MiB is refused before spawning ("PlantUML source exceeds the 1 MiB preview limit."); an SVG output over 8 MiB kills the process ("PlantUML SVG output exceeds the 8 MiB preview limit.").
- A render over 30 s is stopped, the whole process group killed, with "PlantUML did not finish within 30 s."
- Error text from a process is capped at 64 KiB with "[stderr truncated at 64 KiB]".
- Cancelling a render (a newer render stage, the preview closing) sends SIGTERM to the whole process group on POSIX, falling back to the direct child; an exited child is not signalled. A render that sees close, error and timeout together settles once. Known issue: Windows, which has no process group, is untested.
