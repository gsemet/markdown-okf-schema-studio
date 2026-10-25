---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-032
uuid: 6d1d3b08-6778-4104-9ed6-52868a07cc41
title: The built-in engine refuses what needs a URL, a library or more than 1
  MiB
description: When a built-in diagram needs a URL, a library, a theme read from a
  folder or more than 1 MiB of source, or the built-in engine fails, the page
  SHALL show one message that says why, with the useJar hint where it applies,
  instead of a picture, and fetch or load nothing.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-006
- StRS-MDOKFSTUDIO-DIAG-007
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/contentBlockStyles.ts
- src/page/modules/plantumlDiagram.ts
- src/page/modules/plantumlPreview.ts
tested_in_files:
- test/core/preview/diagReq.styles.requirements.test.ts
- test/page/modules/plantumlDiagram.test.ts
- test/visual/scenarioDefinitions2.ts
---

## The built-in engine refuses what needs a URL, a library or more than 1 MiB

### Normative behavior

When a built-in diagram needs a URL, a library, a theme read from a folder or more than 1 MiB of source, or the built-in engine fails, the page SHALL show one message that says why, with the useJar hint where it applies, instead of a picture, and fetch or load nothing.

### Scenario (nominal): Library include
- GIVEN a diagram with an include of the C4 library name in angle brackets on line 3
- WHEN the page draws it
- THEN when a built-in diagram has a line starting with !includeurl, !includedef or !import, an include of a URL or of a library name in angle brackets, or a !theme with from, the page shows one message naming the directive and its line and the useJar hint instead of a picture and sets data-render-state to unavailable
- AND here the message names that directive and line 3 and the useJar hint, there is no picture, the state is unavailable, and the source disclosure keeps the text
- AND the engine is not run and no previewPlantUmlInclude message is sent

### Scenario (boundary): Directives that are refused before the engine
| Input | Outcome |
| --- | --- |
| a line starting with !includeurl, !includedef or !import | the message naming the directive and its line, state unavailable; the engine is not run and the host is not asked for a file |
| an include of a URL, or of a library name in angle brackets | the same message, state unavailable; no engine run and no host request |
| a !theme with from | the same message, state unavailable; no engine run and no host request |
| a source with CRLF line endings and an indented !includeurl line on line 2 | the message names line 2 |
| a diagram with an include of a local file only | not refused: the file is asked of the host and the engine runs (see SwRS-MDOKFSTUDIO-DIAG-046) |

### Scenario (refusal): Loaders of the built-in engine refuse
| Input | Outcome |
| --- | --- |
| the engine asks for a library URL (a standard-library bundle) or an optional script such as emoji | the loader answers with an error saying it is not available in the built-in PlantUML engine; no script tag is added and nothing is fetched |
| the engine globals after installation | no standard-library base address is set, so no remote server is named |
| a diagram renderer created without a host; the engine asks for a local file | the request is refused with a reason naming the file |
| a page that has no connection to the editor; an include request is dispatched | the request is answered with the reason that the page has no connection to the editor; no file text reaches the engine |
| a loader request of kind theme (a !theme read from a folder or a URL, even if the pre-scan did not catch the directive) | the loader answers with an error saying the theme is not available in the built-in PlantUML engine; no theme file is read |
| the same theme refusal during a render | the diagram shows the include failure message with the failure reason as its message, state error, and the result is not kept |

### Scenario (refusal): Unsupported directive inside an included file
- GIVEN an included local file with an include of a library name on line 2
- WHEN the diagram is drawn
- THEN the diagram shows the unavailable message naming the directive, line 2, the file name and the useJar hint, and the state is unavailable
- AND the refusal is not kept: the diagram drawn again after the file was fixed runs the engine again with the new file text

### Scenario (refusal): Engine failure shows its reason
| Input | Outcome |
| --- | --- |
| the engine rejects a diagram (syntax error) with a reason | the message reads "The built-in PlantUML engine could not render this diagram: " followed by the reason as plain text and the useJar hint, no picture, state error, and the source is kept |
| a reason beginning with java.lang.IllegalStateException followed by a colon | the class prefix is removed |
| an empty reason | the text unknown error is used |
| the engine throws | the same message with the thrown message as the reason, state error |

### Scenario (boundary): Source of 1 MiB
| Input | Outcome |
| --- | --- |
| a diagram source of 1,048,577 characters (over 1 MiB) | "The PlantUML source exceeds the 1 MiB preview limit." appears, the state is unavailable and the engine is not run |
| a diagram source of exactly 1,048,576 characters | the engine runs normally |

### Scenario (nominal): Messages use the error style
| Input | Outcome |
| --- | --- |
| a PlantUML diagram that shows a message | the paragraph of class myst-plantuml-error uses --studio-errorForeground (fallback #f14c4c) and italic text |
| a theme without --studio-errorForeground | the fallback red is used |

### Known issues
- Known issue: The directive is matched at the start of a line only; one placed after other text on the line is not detected and falls under the generic engine failure message.
- Known issue: A refused emoji script surfaces as the generic engine failure message.
- Known issue: The no-connection branch of askHost in plantumlPreview.ts is untested.
- Known issue: No diagnostic reaches the status line; only the picture area shows the message.
- Known issue: A plain engine error without a refused include is kept by the result cache and shown again from memory (see SwRS-MDOKFSTUDIO-DIAG-039).
- Known issue: The limit is counted in UTF-16 code units and is the same constant as the JAR pipeline's; README states 1 MiB only for includes.

### Related requirements
- SwRS-MDOKFSTUDIO-DIAG-046: local includes are asked of the host and refusals reach the diagram
- SwRS-MDOKFSTUDIO-DIAG-039: the result cache that keeps or drops a failed render
- SwRS-MDOKFSTUDIO-DIAG-061: the include nesting, file count and size limits

### Verification notes
- Method: test/page/modules/plantumlDiagram.test.ts (library include, directives table, loaders, included file directive, engine failure, 1 MiB boundary)
- Method: test/visual/scenarioDefinitions2.ts, visual scenario diagrams v12 (library include: message, useJar hint, source kept)
- Method: test/core/preview/diagReq.styles.requirements.test.ts (messages use the error style: theme colour with a red fallback, in italics)
- Criteria: The engine is not run and the host is not asked for an unsupported directive; every library request ends in an error and nothing is loaded; no file text reaches the engine without a render or a host; no theme file is read; the refusing file is named and the result is not cached; the reason is text and the prefix is stripped; the comparison with the limit is strictly greater than; error colour and italic style hold.
