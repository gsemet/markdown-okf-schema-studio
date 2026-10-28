---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-061
uuid: 87a04206-e651-4f11-b561-261850d2bd5c
title: Includes nest at most 8 deep, 64 files and 1 MiB
description: When a built-in diagram includes files, the page SHALL refuse the
  include that passes 8 levels of nesting, 64 distinct files or 1 MiB of text,
  and stop at an include cycle, with a reason shown on the diagram.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-009
depends_on:
- SwRS-MDOKFSTUDIO-DIAG-046
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/plantumlDiagram.ts
tested_in_files:
- test/page/modules/plantumlDiagram.test.ts
default_owner_email: gaetan@xeberon.net
---

## Includes nest at most 8 deep, 64 files and 1 MiB

### Normative behavior

When a built-in diagram includes files, the page SHALL refuse the include that passes 8 levels of nesting, 64 distinct files or 1 MiB of text, and stop at an include cycle, with a reason shown on the diagram.

### Scenario (nominal): Eighth level
- GIVEN a chain of eight nested includes
- WHEN the diagram is drawn
- THEN all eight files are read and the picture is drawn

### Scenario (boundary): Limits of one diagram
Each limit refuses the include that crosses it; the reason is shown on the diagram.

| Input | Outcome |
| --- | --- |
| Chain of nine nested includes | the ninth file is refused with the reason that the file is nested deeper than 8 includes, and the diagram shows it |
| 65 distinct includes | the 65th is refused with the reason that a diagram includes at most 64 files |
| Same file included twice from the same file | the file counts once (the count is of distinct requests) |
| Included files that together pass 1 MiB of text (the diagram's own text counts toward the limit) | the include that crosses the limit is refused with the reason that the diagram with its included files exceeds the 1 MiB preview limit |
| One large file included twice | its text is counted once |

### Scenario (refusal): Include cycle
| Input | Outcome |
| --- | --- |
| File a includes file b which includes file a | the diagram shows the reason that the file includes itself (an include cycle), naming the file, and does not loop |
| A {uml} diagram file that includes itself | the same cycle reason is shown |

### Related requirements

- SwRS-MDOKFSTUDIO-DIAG-046: the page asks the host for each include and shows the refusal
- SwRS-MDOKFSTUDIO-DIAG-054: the host's own refusals of an include request
- SwRS-MDOKFSTUDIO-DIAG-032: the 1 MiB limit of the source of one diagram

### Verification notes

- Method: test/page/modules/plantumlDiagram.test.ts (includes nested deeper than 8 files are refused: eighth level and ninth level; a diagram includes at most 64 files and at most 1 MiB of text with its includes: 65th file, repeated include, crossing the limit, same file twice; an include cycle is stopped with a message, also back to the diagram's own file: cycle scenario).
- Criteria: Depth 8 passes, depth 9 fails; the count is of distinct requests; the diagram's own text counts toward the 1 MiB limit; no unbounded recursion.
