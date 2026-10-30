---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-054
uuid: d9f64b34-93fb-4976-a89a-6e4b75dc01db
title: The host reads an include only next to the including file in allowed
  folders
description: When the built-in engine asks the host for an include file, the
  host SHALL read it only next to the including file inside the allowed folders
  and refuse every other request with a reason.
project: markdown-okf-schema-studio
scope: diagrams
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-009
- StRS-MDOKFSTUDIO-DIAG-007
depends_on:
- SwRS-MDOKFSTUDIO-DIAG-050
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/plantUmlIncludes.ts
tested_in_files:
- test/core/render/plantUmlIncludes.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-DIAG-055
- SwRS-MDOKFSTUDIO-DIAG-056
- SwRS-MDOKFSTUDIO-DIAG-057
- SwRS-MDOKFSTUDIO-DIAG-058
- SwRS-MDOKFSTUDIO-DIAG-059
- SwRS-MDOKFSTUDIO-DIAG-060
---

## The host reads an include only next to the including file in allowed folders

### Normative behavior

When the built-in engine asks the host for an include file, the host SHALL read it only next to the including file inside the allowed folders and refuse every other request with a reason.

### Scenario (nominal): Includes resolve next to the including file
The base folder follows from.

| Input | Outcome |
| --- | --- |
| Include request with from null (top-level include) | the name is resolved from the previewed document's folder; a from of null is accepted |
| Include request whose from is the absolute path of an included file in a sub folder (nested include) | the name is resolved from that sub folder |

### Scenario (boundary): Trust state and files that are served
The folders an include may read follow the trust of the workspace.

| Input | Outcome |
| --- | --- |
| Trusted workspace, include of a sibling folder inside the workspace | the file is served |
| Restricted Mode (untrusted workspace), the same include | refused with the reason that the file is outside the folders the preview reads (only the document's folder and below are read) |
| Include file of a few kilobytes | served |
| Symbolic link whose target stays inside the allowed folders | the file is served |

### Scenario (refusal): Names that are never read
- GIVEN an include request for C4/C4_Context in angle brackets, a URL, or a name that is only spaces
- WHEN the host resolves it
- THEN it is refused without reading the disk

### Scenario (refusal): Reasons by kind of name
| Input | Outcome |
| --- | --- |
| Library name in angle brackets (C4/C4_Context) | reason saying the built-in engine reads no URL and no standard library |
| URL | same reason: the name is not a local file, the built-in engine reads no URL and no standard library |
| Name that is empty after trimming (only spaces) | The include names no file. |
| Absolute path (leading slash) | PlantUML file followed by the name and must be a relative path to a local file |

### Scenario (refusal): A forged relative from is refused
- GIVEN an include request with from equal to a relative path
- WHEN the host resolves it
- THEN it is refused with the reason PlantUML file followed by the name and could not be read

### Scenario (refusal): A missing file or a file the rules reject
| Input | Outcome |
| --- | --- |
| File that does not exist in the document's folder | refused with the reason PlantUML file not found followed by the name, and the candidate path is reported for watching |
| Path outside the allowed folders | refused with the outside-folders reason and no path is reported for watching |
| Include file larger than 5 MiB | refused with the reason that the file is larger than the 5 MiB preview limit |
| Symbolic link in the document's folder that points outside the workspace | refused with the outside-folders reason (links are judged by their real path) |

### Known issues

- Known issue: The check treats any name starting with a letter sequence and a colon as a URL, so a Windows drive path such as C:\diagrams\a.puml is refused as not local.

### Related requirements

- SwRS-MDOKFSTUDIO-DIAG-050: the include request the host accepts before it resolves it
- SwRS-MDOKFSTUDIO-DIAG-046: how a refusal reaches the diagram
- SwRS-MDOKFSTUDIO-DIAG-053: the paths this resolver reports are watched there

### Verification notes

- Method: test/core/render/plantUmlIncludes.test.ts (a top-level include resolves next to the document, a nested one next to the including file: nominal; a trusted workspace serves the workspace and Restricted Mode serves only the document's folder and below: trust boundary; blank names, URLs, library names, absolute paths and a relative from are refused: both name and from refusals; a missing file is refused and watched, a too large file and a symlink escape are refused: missing and rejected-file refusals). The served small file and the symlink that stays inside the folders are checked only through these tests, with no test of their own.
- Criteria: No disk access for blank, URL and library names; only a null or absolute from proceeds; the base folder follows from; folder scope follows trust; links are judged by their real path; the size limit applies to every include.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-009](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-009.md): PlantUML diagrams use local include files and PUML files
  - [StRS-MDOKFSTUDIO-DIAG-007](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-007.md): A writer renders PlantUML with an own JAR or command, safely bounded
- Depends on:
  - [SwRS-MDOKFSTUDIO-DIAG-050](SwRS-MDOKFSTUDIO-DIAG-050.md): The host accepts only well-formed include requests
- Supersedes:
  - [SwRS-MDOKFSTUDIO-DIAG-055](SwRS-MDOKFSTUDIO-DIAG-055.md): A forged relative from is refused
  - [SwRS-MDOKFSTUDIO-DIAG-056](SwRS-MDOKFSTUDIO-DIAG-056.md): Includes resolve next to the including file
  - [SwRS-MDOKFSTUDIO-DIAG-057](SwRS-MDOKFSTUDIO-DIAG-057.md): The trust state sets the folders an include may read
  - [SwRS-MDOKFSTUDIO-DIAG-058](SwRS-MDOKFSTUDIO-DIAG-058.md): A missing include file is refused and watched
  - [SwRS-MDOKFSTUDIO-DIAG-059](SwRS-MDOKFSTUDIO-DIAG-059.md): An include file over 5 MiB is refused
  - [SwRS-MDOKFSTUDIO-DIAG-060](SwRS-MDOKFSTUDIO-DIAG-060.md): A symlink leaving the allowed folders is refused
<!-- okf:links:end -->
