---
type: StRS
id: StRS-MDOKFSTUDIO-DIAG-014
uuid: 307808fa-8dbc-41eb-ad51-9ad60e70fafc
title: A runaway PlantUML process cannot hang the preview
description: When a JAR-rendered diagram is too large, too slow, too chatty or
  cancelled, the Studio SHALL stop it and report the reason.
project: markdown-okf-schema-studio
scope: diagrams
req_lifecycle: superseded
status: deprecated
origin: native
tier: StRS
derives_from: []
user_need: As a writer, a heavy or broken diagram never freezes the editor or
  leaves processes running.
derived_by: []
superseded_by:
- StRS-MDOKFSTUDIO-DIAG-007
default_owner_email: gaetan@xeberon.net
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

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Superseded by:
  - [StRS-MDOKFSTUDIO-DIAG-007](StRS-MDOKFSTUDIO-DIAG-007.md): A writer renders PlantUML with an own JAR or command, safely bounded
<!-- okf:links:end -->
