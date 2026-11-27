---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-032
uuid: 6d1d3b08-6778-4104-9ed6-52868a07cc41
title: The built-in engine refuses what needs a URL, a library or more than 1
  MiB
description: When a built-in diagram needs a URL, a library, a theme read from a
  folder or more than 1 MiB of source, or the built-in engine fails, the page
  SHALL say why, with the render state unavailable or error, in one message
  instead of a picture, with the useJar hint where it applies, or in the
  engine's own error picture, and fetch or load nothing.
project: markdown-okf-schema-studio
scope: diagrams
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-006
- StRS-MDOKFSTUDIO-DIAG-007
depends_on: []
scenarios:
- id: S1
  title: Library include
- id: S2
  title: Directives that are refused before the engine
- id: S3
  title: Loaders of the built-in engine refuse
- id: S4
  title: Unsupported directive inside an included file
- id: S5
  title: Engine failure shows its reason
- id: S6
  title: Source of 1 MiB
- id: S7
  title: Messages use the error style
- id: S8
  title: The engine's error picture is a failed render
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/contentBlockStyles.markers.ts
- src/page/modules/plantumlDiagram.ts
tested_in_files:
- test/core/preview/diagReq.styles.requirements.test.ts
- test/page/modules/plantumlDiagram.test.ts
- test/page/plantumlErrorPicture.test.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-DIAG-033
- SwRS-MDOKFSTUDIO-DIAG-034
- SwRS-MDOKFSTUDIO-DIAG-035
- SwRS-MDOKFSTUDIO-DIAG-036
- SwRS-MDOKFSTUDIO-DIAG-037
- SwRS-MDOKFSTUDIO-DIAG-038
- SwRS-MDOKFSTUDIO-DIAG-082
- SwRS-MDOKFSTUDIO-DIAG-112
---

## The built-in engine refuses what needs a URL, a library or more than 1 MiB

### Normative behavior

When a built-in diagram needs a URL, a library, a theme read from a folder or more than 1 MiB of source, or the built-in engine fails, the page SHALL say why, with the render state unavailable or error, in one message instead of a picture, with the useJar hint where it applies, or in the engine's own error picture, and fetch or load nothing.

### Scenario S1 (nominal): Library include
- GIVEN a diagram with an include of the C4 library name in angle brackets on line 3
- WHEN the page draws it
- THEN when a built-in diagram has a line starting with !includeurl, !includedef or !import, an include of a URL or of a library name in angle brackets, or a !theme with from, the page shows one message naming the directive and its line and the useJar hint instead of a picture and sets data-render-state to unavailable
- AND here the message names that directive and line 3 and the useJar hint, there is no picture, the state is unavailable, and the source disclosure keeps the text
- AND the engine is not run and no previewPlantUmlInclude message is sent

### Scenario S2 (boundary): Directives that are refused before the engine
| Input | Outcome |
| --- | --- |
| a line starting with !includeurl, !includedef or !import | the message naming the directive and its line, state unavailable; the engine is not run and the host is not asked for a file |
| an include of a URL, or of a library name in angle brackets | the same message, state unavailable; no engine run and no host request |
| a !theme with from | the same message, state unavailable; no engine run and no host request |
| a source with CRLF line endings and an indented !includeurl line on line 2 | the message names line 2 |
| a diagram with an include of a local file only | not refused: the file is asked of the host and the engine runs (see SwRS-MDOKFSTUDIO-DIAG-046) |

### Scenario S3 (refusal): Loaders of the built-in engine refuse
| Input | Outcome |
| --- | --- |
| the engine asks for a library URL (a standard-library bundle) or an optional script such as emoji | the loader answers with an error saying it is not available in the built-in PlantUML engine; no script tag is added and nothing is fetched |
| the engine globals after installation | no standard-library base address is set, so no remote server is named |
| a diagram renderer created without a host; the engine asks for a local file | the request is refused with a reason naming the file |
| a page that has no connection to the editor; an include request is dispatched | the request is answered with the reason that the page has no connection to the editor; no file text reaches the engine |
| a loader request of kind theme (a !theme read from a folder or a URL, even if the pre-scan did not catch the directive) | the loader answers with an error saying the theme is not available in the built-in PlantUML engine; no theme file is read |
| the same theme refusal during a render | the diagram shows the include failure message with the failure reason as its message, state error, and the result is not kept |

### Scenario S4 (refusal): Unsupported directive inside an included file
- GIVEN an included local file with an include of a library name on line 2
- WHEN the diagram is drawn
- THEN the diagram shows the unavailable message naming the directive, line 2, the file name and the useJar hint, and the state is unavailable
- AND the refusal is not kept: the diagram drawn again after the file was fixed runs the engine again with the new file text

### Scenario S5 (refusal): Engine failure shows its reason
| Input | Outcome |
| --- | --- |
| the engine answers a diagram with a reason instead of a picture | the message reads "The built-in PlantUML engine could not render this diagram: " followed by the reason as plain text and the useJar hint, no picture, state error, and the source is kept |
| a reason beginning with java.lang.IllegalStateException followed by a colon | the class prefix is removed |
| an empty reason | the text unknown error is used |
| the engine throws | the same message with the thrown message as the reason, state error |

### Scenario S6 (boundary): Source of 1 MiB
| Input | Outcome |
| --- | --- |
| a diagram source of 1,048,577 characters (over 1 MiB) | "The PlantUML source exceeds the 1 MiB preview limit." appears, the state is unavailable and the engine is not run |
| a diagram source of exactly 1,048,576 characters | the engine runs normally |

### Scenario S7 (nominal): Messages use the error style
| Input | Outcome |
| --- | --- |
| a PlantUML diagram that shows a message | the paragraph of class myst-plantuml-error uses --studio-errorForeground (fallback #f14c4c) and italic text |
| a theme without --studio-errorForeground | the fallback red is used |

### Scenario S8 (refusal): The engine's error picture is a failed render
| Input | Outcome |
| --- | --- |
| a source the engine cannot draw and answers with a picture of the lines it read under a "[From ... (line N) ]" banner (a line that is not PlantUML, a broken class body, a diagram with nothing in it) | the engine's picture is shown as it is, with no message, state error, and the "Diagram source" disclosure is shown, closed, in the preview and the HTML export |
| JSON or YAML that does not parse, answered with the picture "Your data does not sound like JSON data" (or YAML) | the same |
| a diagram kind answered with the picture "Diagram not supported by this release of PlantUML" | the same |
| a diagram that writes those words in a message, a note or a title | drawn: state rendered, the source disclosure is hidden |
| a diagram with an include answered with an error picture, drawn again from memory, then drawn after the included file changed | state error both times without a second engine run, then state rendered |

### Known issues
- Known issue: The directive is matched at the start of a line only; one placed after other text on the line is not detected and falls under the generic engine failure message.
- Known issue: A refused emoji script surfaces as the generic engine failure message.
- Known issue: The no-connection branch of askHost in plantumlPreview.ts is untested.
- Known issue: No diagnostic reaches the status line; only the picture area shows the message.
- Known issue: A plain engine error without a refused include is kept by the result cache and shown again from memory (see SwRS-MDOKFSTUDIO-DIAG-039).
- Known issue: The limit is counted in UTF-16 code units and is the same constant as the JAR pipeline's; docs/user/plantuml.md states 1 MiB only for includes.
- Known issue: The error pictures are recognised by the three forms of the bundled engine (@plantuml/core 1.2026.9). The picture the engine draws when it crashes could not be produced and is not recognised, and a source the engine draws only in part (a YAML flow left open) counts as drawn.
- Known issue: An error picture carries no useJar hint.

### Related requirements
- SwRS-MDOKFSTUDIO-DIAG-046: local includes are asked of the host and refusals reach the diagram
- SwRS-MDOKFSTUDIO-DIAG-039: the result cache that keeps or drops a failed render
- SwRS-MDOKFSTUDIO-DIAG-061: the include nesting, file count and size limits

### Verification notes
- Method: test/page/modules/plantumlDiagram.test.ts (library include, directives table, loaders, included file directive, engine failure, 1 MiB boundary)
- Method: test/visual/scenarioDefinitions2.ts, visual scenario diagrams v12 (library include: message, useJar hint, source kept)
- Method: test/core/preview/diagReq.styles.requirements.test.ts (messages use the error style: theme colour with a red fallback, in italics)
- Method: test/page/plantumlErrorPicture.test.ts (headless Chromium, the real engine: the error pictures and the diagrams that write their words, in the preview and the HTML export; skipped where no Chromium starts)
- Method: test/page/modules/plantumlDiagram.test.ts (an error picture kept in memory and drawn again after a changed include)
- Criteria: The engine is not run and the host is not asked for an unsupported directive; every library request ends in an error and nothing is loaded; no file text reaches the engine without a render or a host; no theme file is read; the refusing file is named and the result is not cached; the reason is text and the prefix is stripped; the comparison with the limit is strictly greater than; error colour and italic style hold; an error picture stays shown with the state error and its source disclosure shown and closed; a diagram that writes the same words ends rendered.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-006](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-006.md): A writer reads PlantUML diagrams without any setup
  - [StRS-MDOKFSTUDIO-DIAG-007](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-007.md): A writer renders PlantUML with an own JAR or command, safely bounded
- Supersedes:
  - [SwRS-MDOKFSTUDIO-DIAG-033](SwRS-MDOKFSTUDIO-DIAG-033.md): The library loaders of the built-in engine refuse every request
  - [SwRS-MDOKFSTUDIO-DIAG-034](SwRS-MDOKFSTUDIO-DIAG-034.md): The file loader refuses local files without a render or a host
  - [SwRS-MDOKFSTUDIO-DIAG-035](SwRS-MDOKFSTUDIO-DIAG-035.md): A theme read from a folder is refused
  - [SwRS-MDOKFSTUDIO-DIAG-036](SwRS-MDOKFSTUDIO-DIAG-036.md): Unsupported directives inside included files name the file
  - [SwRS-MDOKFSTUDIO-DIAG-037](SwRS-MDOKFSTUDIO-DIAG-037.md): A built-in engine failure shows its reason
  - [SwRS-MDOKFSTUDIO-DIAG-038](SwRS-MDOKFSTUDIO-DIAG-038.md): The built-in engine refuses a source over 1 MiB
  - [SwRS-MDOKFSTUDIO-DIAG-082](SwRS-MDOKFSTUDIO-DIAG-082.md): PlantUML messages use the error style
  - [SwRS-MDOKFSTUDIO-DIAG-112](SwRS-MDOKFSTUDIO-DIAG-112.md): Unsupported directives never reach the engine or the host
<!-- okf:links:end -->
