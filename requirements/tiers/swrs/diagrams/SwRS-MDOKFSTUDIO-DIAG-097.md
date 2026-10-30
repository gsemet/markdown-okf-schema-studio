---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-097
uuid: bf193063-df1c-402e-99f8-b437900dcd45
title: A JAR render is bounded in input, output, time, process lifetime and
  concurrency
description: When a JAR render meets a bound on the diagram text, the output,
  the error text or the run time, or is cancelled, the extension SHALL end it
  with a message on the diagram, kill the whole PlantUML process group where it
  started one, keep at most the first 64 KiB of error text followed by the note
  [stderr truncated at 64 KiB], and settle the render exactly once without
  raising an uncaught exception in the extension host. The extension SHALL run
  at most 2 PlantUML processes at once, queueing the others, and SHALL reuse the
  SVG of an earlier successful render of the same diagram text under the same
  command, arguments, workspace root, security profile and JAR size and
  modification time, without starting a process; diagram text that reads files
  or the environment is never reused.
project: markdown-okf-schema-studio
scope: diagrams
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-007
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/plantUmlRenderer.ts
tested_in_files:
- test/core/render/diagReq.jar.requirements.test.ts
- test/core/render/plantUmlCache.test.ts
- test/core/render/plantUmlRenderer.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-DIAG-098
- SwRS-MDOKFSTUDIO-DIAG-099
- SwRS-MDOKFSTUDIO-DIAG-100
- SwRS-MDOKFSTUDIO-DIAG-101
- SwRS-MDOKFSTUDIO-DIAG-102
- SwRS-MDOKFSTUDIO-DIAG-103
- SwRS-MDOKFSTUDIO-DIAG-118
---

## A JAR render is bounded in input, output, time and process lifetime

### Normative behavior

When a JAR render meets a bound on the diagram text, the output, the error text or the run time, or is cancelled, the extension SHALL end it with a message on the diagram, kill the whole PlantUML process group where it started one, keep at most the first 64 KiB of error text followed by the note [stderr truncated at 64 KiB], and settle the render exactly once without raising an uncaught exception in the extension host.

The extension SHALL run at most 2 PlantUML processes at once and queue the others. It SHALL reuse the SVG of an earlier successful render of the same diagram text under the same command, arguments, workspace root, security profile and JAR size and modification time, without starting a process. Diagram text with an include, import, theme, pragma or environment-reading directive is never reused, and a failed render is never kept.

### Scenario (nominal): An unchanged diagram is not rendered twice
| Input | Outcome |
| --- | --- |
| the same diagram text rendered twice under one JAR | one process starts; the second render returns the same SVG |
| another diagram text, a replaced JAR, an include directive or an earlier failure | a process starts |

### Scenario (boundary): At most 2 processes run at once
| Input | Outcome |
| --- | --- |
| 5 diagrams in one page | never more than 2 processes run together and all 5 are rendered |

### Scenario (boundary): Error text is capped at 64 KiB
| Input | Outcome |
| --- | --- |
| a failing process that writes more than 64 KiB to its error output | the message holds at most the first 64 KiB of error text followed by [stderr truncated at 64 KiB] |
| a failing process with a short error output | the whole text is shown with no note |

### Scenario (boundary): The diagram text is limited to 1 MiB
| Input | Outcome |
| --- | --- |
| a diagram text of 1,048,577 characters with useJar on | the diagram shows PlantUML source exceeds the 1 MiB preview limit. with state error and no process starts |
| a diagram text of exactly 1,048,576 characters | the process is started |

### Scenario (boundary): The output is limited to 8 MiB
| Input | Outcome |
| --- | --- |
| a process that writes more than 8 MiB to its standard output | the process is killed and the diagram shows PlantUML SVG output exceeds the 8 MiB preview limit. with state error |
| a process whose output is exactly 8 MiB | the output is accepted |

### Scenario (refusal): A render stops after 30 seconds
- GIVEN a process that never answers
- WHEN 30 seconds pass
- THEN the whole process group is killed and the diagram shows PlantUML did not finish within 30 s. with state error
- AND a process that answers in time ends with its timer cleared and no timeout message

### Scenario (nominal): Cancelling a render stops the process group
- GIVEN a running PlantUML process on POSIX and a render cancelled by a newer render stage or the closing of the preview
- WHEN the render is cancelled
- THEN SIGTERM goes to the whole process group, falling back to the direct child, and the diagram reports PlantUML rendering was canceled.
- AND a process that has already exited receives no signal

### Scenario (refusal): A render already cancelled starts no process
- GIVEN a render whose abort signal is already set
- WHEN the render starts
- THEN no process is started and PlantUML rendering was canceled. is reported
- AND an abort signal that fires after the render has settled changes nothing

### Scenario (refusal): A process that ignores its input becomes a message
- GIVEN a process that exits before reading its input, or a standard input that emits an error
- WHEN the diagram is rendered
- THEN the diagram shows a failure message, the render ends with a diagnostic and the host raises no uncaught exception

### Scenario (boundary): A render settles exactly once
- GIVEN the close, error and timeout events of one process firing in the same tick
- WHEN the events are handled
- THEN the render has one result and the later events are ignored

### Known issues
- Known issue: The test of the time limit uses a shortened timeout; the 30 s constant itself is asserted separately.
- Known issue: The cache holds up to 64 diagrams in memory and is not cleared when a file read by an include directive changes, so such diagrams are simply never cached.
- Known issue: Windows, which has no process group, is untested.

### Related requirements
- SwRS-MDOKFSTUDIO-DIAG-084: how the JAR pipeline runs one process per diagram.
- SwRS-MDOKFSTUDIO-DIAG-089: the other failures a JAR diagram reports.

### Verification notes
- Method: test/core/render/plantUmlRenderer.test.ts (caps stderr at 64 KiB and notes the truncation; kills a hung child at the timeout with a clear diagnostic with a shortened timeout; cancels an active PlantUML process; spawns detached and kills the process group on POSIX; abort falls back to child.kill; does not group-kill a child that already exited; a child that exits before reading stdin does not raise an uncaught exception; a stdin error settles the render with a diagnostic; settles exactly once when close, error and timeout race; the already cancelled render).
- Method: test/core/render/diagReq.jar.requirements.test.ts `a diagram text over 1 MiB is refused without a process, a text of exactly 1 MiB is rendered` and `an output over 8 MiB stops the process; an output of exactly 8 MiB is accepted` (1 MiB and 8 MiB boundaries).
- Method: test/core/render/plantUmlCache.test.ts `a second render of the same source starts no process` and `at most two PlantUML processes run at once`.
- Criteria: The limits are strictly greater than 1 MiB and 8 MiB, the timeout constant is 30000 ms, the group is killed with a fallback, exited children are untouched, and a render has one result.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-007](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-007.md): A writer renders PlantUML with an own JAR or command, safely bounded
- Supersedes:
  - [SwRS-MDOKFSTUDIO-DIAG-098](SwRS-MDOKFSTUDIO-DIAG-098.md): The JAR pipeline refuses a source over 1 MiB
  - [SwRS-MDOKFSTUDIO-DIAG-099](SwRS-MDOKFSTUDIO-DIAG-099.md): The JAR pipeline stops an output over 8 MiB
  - [SwRS-MDOKFSTUDIO-DIAG-100](SwRS-MDOKFSTUDIO-DIAG-100.md): A JAR render stops after 30 seconds
  - [SwRS-MDOKFSTUDIO-DIAG-101](SwRS-MDOKFSTUDIO-DIAG-101.md): Cancelling a render stops the PlantUML process group
  - [SwRS-MDOKFSTUDIO-DIAG-102](SwRS-MDOKFSTUDIO-DIAG-102.md): A process that ignores its input becomes a message
  - [SwRS-MDOKFSTUDIO-DIAG-103](SwRS-MDOKFSTUDIO-DIAG-103.md): A render settles exactly once
  - [SwRS-MDOKFSTUDIO-DIAG-118](SwRS-MDOKFSTUDIO-DIAG-118.md): A cancelled JAR render reports the cancellation
<!-- okf:links:end -->
