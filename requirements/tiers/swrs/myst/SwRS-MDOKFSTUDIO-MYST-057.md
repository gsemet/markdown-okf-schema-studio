---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-057
uuid: 8c928aff-674c-40e5-8dae-bc3955eb162e
title: "Toctree lists linked documents and marks missing ones"
description: "When a document holds a `{toctree}`, the extension SHALL list its documents
  as links that open in the preview, labelled by the given title, else the first level-1
  heading, else the file name, expand glob entries in sorted order and show a document
  that cannot be found as warned text without a link."
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-012
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/documentGlob.ts
- src/core/render/mystGridToctree.ts
tested_in_files:
- test/core/render/gridToctree.test.ts
- test/core/render/renderReq.myst.requirements.test.ts
---

## Toctree lists linked documents and marks missing ones

### Normative behavior

When a document holds a `{toctree}`, the extension SHALL list its documents as links that open in the preview, labelled by the given title, else the first level-1 heading, else the file name, expand glob entries in sorted order and show a document that cannot be found as warned text without a link.

### Scenario (nominal): Entries render as labelled preview links
- GIVEN entries a Title followed by the target in angle brackets and a bare target
- WHEN the preview renders
- THEN the first uses Title and the second the target's first level-1 heading, skipping frontmatter and code fences, else the file name

### Scenario (boundary): Entry kinds
| Input | Outcome |
| --- | --- |
| A web address entry | An external link |
| A target with `.myst`, `.markdown` or the exact name | The target is found by those extensions |

### Scenario (boundary): Caption, hidden, reversed and size options
| Input | Outcome |
| --- | --- |
| `:caption: Guide` | A level-2 heading Guide appears above the list |
| `:hidden:` | Nothing is shown |
| `:reversed:` with three entries | They appear in reverse order |
| Three entries without `:reversed:` | They keep the written order |
| 501 entries | 500 are shown |
| 500 entries | All are shown |

The options are independent.

### Scenario (nominal): Glob entries list the matching documents sorted
| Input | Outcome |
| --- | --- |
| `:glob:` with `chapters/*` matching three files | Three links appear in sorted order |
| A folder with `b.md` and `a.md` and the glob `*` | a.md is listed before b.md |
| A non-Markdown file | It is not listed |
| A wildcard matching nothing | It shows as a missing entry |

A glob entry uses `*`, `**`, `?` or `[abc]` and lists the matching `.md`, `.markdown` and `.myst` documents below the folder.

### Scenario (boundary): Glob scan limits
| Input | Outcome |
| --- | --- |
| A folder holding 250 matches | 200 are listed |
| A match inside `node_modules`, `.git`, `_build` or `out` | It is not listed |
| Folders beyond 400 or levels beyond 8 | They are not read |

### Scenario (refusal): Missing documents show as warned text
| Input | Outcome |
| --- | --- |
| An entry naming a missing file | Its text shows without a link, in a warning style, with the tooltip Document not found: name |
| No document reader available | Every entry shows as missing |

No warning is added to the status region or the Problems view either way, and no diagnostic is raised.

### Verification notes
- Method: test/core/render/gridToctree.test.ts ("a toctree lists links labelled by the target H1, the file name or an explicit title": labelled links, entry kinds, caption and hidden; "a glob entry lists the matching documents sorted": glob entries; "listGlobDocuments returns the sorted matching Markdown documents below the folder": glob scan limits; "a missing target is shown with the warning style and no link": missing documents)
- Method: test/core/render/renderReq.myst.requirements.test.ts ("a toctree with :reversed: flips the entry order and keeps the written order otherwise": reversed; "a toctree shows at most 500 entries and all of them when there are 500": 500 entries)
- Criteria: Reads follow the resource policy and the standalone preview reads its own folder; matches are Markdown documents, sorted; scan limits and skipped folders hold; no diagnostic either way.
