---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-004
uuid: c0e8b47f-558e-4a78-be2e-186e32853af8
title: Files dropped from the Explorer become links or images at the drop point
description: When the writer drops one or more local files from the VS Code
  Explorer onto the preview in edit mode with no block editor open, the
  extension SHALL mark the insertion point nearest to the pointer while they are
  over the page and, on the drop, write there a new block with one relative
  Markdown reference per file, ![name](path) for a png, jpg, jpeg, gif, svg or
  webp image and [title](path) for any other file, with the first heading of a
  Markdown file as its title, in one undo step, leaving the rest of the source
  unchanged.
project: MDOKFSTUDIO
scope: palette-slash
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-001
- StRS-MDOKFSTUDIO-PALETTE-018
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/mapping/dropReferences.ts
- src/core/protocol/pageToHost.ts
- src/page/features/fileDrop.ts
- src/page/modules/dropFiles.ts
- src/session/features/sourceEdits.ts
tested_in_files:
- test/core/mapping/dropReferences.test.ts
- test/integration/dropFiles.test.ts
- test/page/modules/dropFiles.test.ts
- test/page/runtimeFileDrop.test.ts
- test/session/dropFiles.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## Files dropped from the Explorer become links or images at the drop point

### Normative behavior

When the writer drops one or more local files from the VS Code Explorer onto the preview in edit mode with no block editor open, the extension SHALL mark the insertion point nearest to the pointer while they are over the page and, on the drop, write there a new block with one relative Markdown reference per file, ![name](path) for a png, jpg, jpeg, gif, svg or webp image and [title](path) for any other file, with the first heading of a Markdown file as its title, in one undo step, leaving the rest of the source unchanged.

### Scenario (nominal): A Markdown file becomes a link titled by its first heading
- GIVEN the preview in edit mode with no editor open and a Markdown file whose first heading is "Getting started" in the folder of the document
- WHEN the writer drags the file over the lower half of a paragraph and drops it
- THEN the insertion bar after that paragraph shows the drop marker while the file is over the page, and on the drop a new block `[Getting started](The%20Guide.md)` is written after the paragraph in one undo step

### Scenario (nominal): An image becomes an image reference
- GIVEN the same preview and a png file in a sibling folder, dropped together with a Markdown file that has no heading
- WHEN the writer drops them after the last paragraph
- THEN one new block `![logo](../img/logo.png) [plain](plain.md)` is written after it: the image takes its file name without extension as alt text, and the file without heading takes its name

### Scenario (boundary): What is refused or left alone
| Case | Outcome |
| --- | --- |
| a drag that carries no file addresses, a block editor or property editor open, or edit mode off | no marker, no message; the page does nothing |
| a file outside every workspace folder, or an address that is not `file:` | not written; when none is left the host answers with a notice and the source is unchanged |
| a document that is not a saved file, a read-only preview, a stale version | refused with a notice, nothing written |
| the insertion point is next to a block that comes from an included file | refused with the notice of the paste of blocks |
| more than 50 files in one drop | the page sends the first 50 |
| a file on another drive than the document, or a name with angle brackets or a line break | no reference for that file |

### Scenario (boundary): The written reference
| Part | Outcome |
| --- | --- |
| destination | relative to the folder of the document, `/` separators, spaces and parentheses percent-encoded |
| link text | first heading of a Markdown file (md, markdown, mdx; first 64 KiB, outside front matter and code, emphasis marks removed); else the name without extension; `[`, `]` and `\` escaped |
| several files | their references on one line separated by a space, in drag order |

### Related requirements
- SwRS-MDOKFSTUDIO-BLOCK-174: the new block goes in like a paste of blocks.

### Verification notes
- Method: test/core/mapping/dropReferences.test.ts (heading, escaping, relative encoding, images)
- Method: test/page/modules/dropFiles.test.ts and test/page/runtimeFileDrop.test.ts (drag data, nearest bar, marker, message)
- Method: test/session/dropFiles.requirements.test.ts (host: workspace check, heading read, edit, refusals)
- Method: test/integration/dropFiles.test.ts (real VS Code window: drag events from the Explorer over the preview, marker and written source)
- Criteria: the text outside the inserted block is identical before and after the drop.
