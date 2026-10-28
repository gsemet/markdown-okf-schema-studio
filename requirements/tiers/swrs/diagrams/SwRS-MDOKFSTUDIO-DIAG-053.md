---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-053
uuid: 40e3767d-9d10-4d5c-9570-9ed952eee6b9
title: Served include files are watched and redraw their diagrams
description: When the host serves an include file, or refuses one that does not
  exist inside the allowed folders, it SHALL remember the canonical path of that
  file and, when the file changes on disk, tell the page with
  previewPlantUmlIncludesChanged so that the diagrams that read files are drawn
  again.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-009
- StRS-MDOKFSTUDIO-DIAG-006
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-059
- SwRS-MDOKFSTUDIO-BLOCK-041
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/plantUmlIncludes.ts
- src/page/modules/plantumlPreview.ts
- src/session/features/plantUml.ts
- src/session/hostEvents.ts
- src/session/previewManager.ts
tested_in_files:
- test/core/render/plantUmlIncludes.test.ts
- test/page/modules/plantumlDiagram.test.ts
- test/page/pageMessages.test.ts
- test/session/diagReq.plantuml.requirements.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-DIAG-045
- SwRS-MDOKFSTUDIO-DIAG-065
- SwRS-MDOKFSTUDIO-DIAG-066
- SwRS-MDOKFSTUDIO-DIAG-067
---

## Served include files are watched and redraw their diagrams

### Normative behavior

When the host serves an include file, or refuses one that does not exist inside the allowed folders, it SHALL remember the canonical path of that file and, when the file changes on disk, tell the page with previewPlantUmlIncludesChanged so that the diagrams that read files are drawn again.

### Scenario (nominal): Served file and missing file are remembered
- GIVEN an include request that the host serves, and an include of a file that does not exist inside the allowed folders
- WHEN the host answers
- THEN the canonical path of the served file, and the candidate path of the missing one, are in the include watch

### Scenario (refusal): Outside the folders
- GIVEN an include request for a path outside the allowed folders
- WHEN the host refuses it
- THEN nothing is remembered for it

### Scenario (refusal): The engine is not the built-in one, or the file id is not the host's
- GIVEN a previewPlantUmlInclude request
- WHEN the Java engine is selected (useJar on, trusted or not), or the request names a `from` that the host never gave in an answer of this document
- THEN the host answers ok false and reads no file; a `from` of null (the document itself) and a `from` the host issued are served as before

### Scenario (nominal): A changed file tells the page
- GIVEN an include file remembered by the watch
- WHEN it changes on disk
- THEN the page receives previewPlantUmlIncludesChanged and draws the diagrams that read files again

### Scenario (boundary): Editor open
- GIVEN an open block editor
- WHEN an included file changes
- THEN the message is sent after the editor closes (see SwRS-MDOKFSTUDIO-BLOCK-041)

### Scenario (boundary): Shape of previewPlantUmlIncludesChanged
| Input | Outcome |
| --- | --- |
| { type: previewPlantUmlIncludesChanged, documentId } for the document the page shows | accepted; it carries no other field and the page draws again |
| The same type naming another document, or any other value that is not a registered host message | not handled by the page (see SwRS-MDOKFSTUDIO-TRUST-059, addressing by document) |

### Scenario (nominal): Only diagrams that read files are drawn again
- GIVEN a diagram that includes a file and a diagram that includes none
- WHEN the includes-changed event reaches the page
- THEN the first diagram asks the host again and is drawn with the new file text, and the kept results that read files are forgotten

- GIVEN the diagram without includes
- WHEN the same event arrives
- THEN it keeps its picture and its kept result

### Scenario (boundary): The include watch is bounded and cleared
| Input | Outcome |
| --- | --- |
| 1025 remembered files, the last one just remembered | the set holds 1024 and the first is gone |
| An old file remembered again when the limit is exceeded | an older untouched file is forgotten first (the set never exceeds 1024) |
| An include whose parent id was dropped from the 1024 issued ids | refused as an unissued id |
| The preview follows another document | the include watch and the issued file ids are empty, so a file remembered for the earlier document that changes afterwards does not tell the page |

### Known issues

- Known issue: Canonical-path remembering in the controller has no test.
- Known issue: The watcher event to notifyIncludesChanged and the deferral while editing have no session test.

### Related requirements

- SwRS-MDOKFSTUDIO-DIAG-054: the resolver that reports the path to watch
- SwRS-MDOKFSTUDIO-DIAG-046: the include requests that the page redraws
- SwRS-MDOKFSTUDIO-DIAG-050: the include request that makes the host remember the path

### Verification notes

- Method: test/core/render/plantUmlIncludes.test.ts (the include watch remembers a bounded set of files: bound scenario; a missing file is refused and watched: remembered and outside-the-folders scenarios; the controller step that remembers the canonical path is untested).
- Method: test/page/modules/plantumlDiagram.test.ts (after an included file changed, the diagrams that read files are drawn again from the host: redraw scenario, including the diagram without includes).
- Method: test/page/pageMessages.test.ts (host message acceptance, shape of previewPlantUmlIncludesChanged and addressing by document); the host event path, the deferral while editing and the sending of the message have no session test.
- Method: test/session/diagReq.plantuml.requirements.test.ts (`the include watch is emptied when the preview follows another document`: document switch row).
- Method: test/session/diagReq.plantuml.requirements.test.ts (`an include request is refused for the Java engine and for a file id the host never issued`: refusal scenario).
- Criteria: Only served and allowed-missing paths are watched; watched changes notify the page once the editor is closed; only diagrams that read files are redrawn; size never exceeds 1024; no stale watch survives a switch.
