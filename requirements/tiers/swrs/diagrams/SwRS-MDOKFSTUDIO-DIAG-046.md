---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-046
uuid: 3a74fa1f-49b0-4383-b2f8-a131ab38faa9
title: PlantUML includes are read through the extension and refusals reach the
  diagram
description: When a built-in diagram contains !include, !include_many,
  !include_once or !includesub of a local file, the page SHALL ask the extension
  host for the file with a previewPlantUmlInclude message, draw the diagram with
  the text returned, make no network request, and give the engine the reason
  exactly once when the host refuses, does not answer within 10 seconds or sends
  an answer that is not well formed.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-009
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-090
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/hostRequests.ts
- src/page/modules/plantumlDiagram.ts
- src/page/modules/plantumlFileRequests.ts
tested_in_files:
- test/page/modules/plantumlDiagram.test.ts
- test/page/modules/plantumlFileRequests.test.ts
- test/visual/scenarioDefinitions2.ts
---

## PlantUML includes are read through the extension and refusals reach the diagram

### Normative behavior

When a built-in diagram contains !include, !include_many, !include_once or !includesub of a local file, the page SHALL ask the extension host for the file with a previewPlantUmlInclude message, draw the diagram with the text returned, make no network request, and give the engine the reason exactly once when the host refuses, does not answer within 10 seconds or sends an answer that is not well formed.

### Scenario (nominal): Nested include and diagram file include
- GIVEN a diagram that includes a file which includes another file, and a {uml} diagram whose file includes a style file
- WHEN the diagram is drawn
- THEN the host is asked for the first file with from null and for the nested file with from equal to the id of the first, and the picture shows the nested content
- AND for the {uml} diagram the style file is asked with from equal to the id of the diagram file
- AND no network request is made

### Scenario (boundary): The from field of the request
| Input | Outcome |
| --- | --- |
| a request with a string path and from set to a number | the host message carries from null |
| a request with from equal to an absolute path | the host message carries that path |
| a request for the diagram's own include | from is null |

### Scenario (refusal): The host refuses an include
| Input | Outcome |
| --- | --- |
| a host answer ok false with a reason | the engine receives that reason once |
| a second answer for the same request | it is ignored and the engine still received the reason once |

### Scenario (refusal): Silence and malformed answers
| Input | Outcome |
| --- | --- |
| no answer from the host for 10 seconds | the engine receives The editor did not answer. Try again. |
| an ok answer without a text | the engine receives the file name followed by could not be read |

### Scenario (refusal): Malformed include requests are ignored
| Input | Outcome |
| --- | --- |
| a request whose path is not a string | no host message is sent and the request is not marked accepted |
| a file request dispatched without a respond function | it is ignored |
| a file request dispatched without a request object | it is ignored |

### Known issues
- Known issue: The page without a connection to the editor answers with its own reason (see SwRS-MDOKFSTUDIO-DIAG-032).

### Related requirements
- SwRS-MDOKFSTUDIO-DIAG-032: unsupported directives never reach the host, and a page without a connection refuses files
- SwRS-MDOKFSTUDIO-DIAG-050: the host accepts only well-formed include requests
- SwRS-MDOKFSTUDIO-DIAG-054: where the host reads an include
- SwRS-MDOKFSTUDIO-DIAG-061: the include nesting, file count and size limits

### Verification notes
- Method: test/page/modules/plantumlDiagram.test.ts (nested include and diagram file include)
- Method: test/visual/scenarioDefinitions2.ts, visual scenarios diagrams v15 and v16 (nested participant drawn)
- Method: test/page/modules/plantumlFileRequests.test.ts (from field, host refusal, repeated answer, silence and malformed answers, malformed requests)
- Criteria: Each file is requested once per render and drawn; each request ends in one reason or one file; from is a string or null; nothing malformed reaches the host.
