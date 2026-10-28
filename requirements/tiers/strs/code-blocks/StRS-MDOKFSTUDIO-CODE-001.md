---
type: StRS
id: StRS-MDOKFSTUDIO-CODE-001
uuid: 90675ebe-7c19-40bb-af92-107409d27763
title: A reader reads highlighted, numbered and diff code
description: When a writer previews a document with a fenced code block, a diff
  or patch block or a MyST code directive, the Studio SHALL show the code
  literally, with syntax highlighting that follows the VS Code theme for a
  supported language, distinct treatments for added and deleted lines of a diff,
  and the line numbers, emphasized lines, file name and caption that a directive
  sets.
project: markdown-okf-schema-studio
scope: code-blocks
lifecycle: proposed
origin: native
tier: StRS
derives_from: []
user_need: Writers need code samples to read as they would in published
  documentation, in the language and colours of their editor, and reviewers need
  to see at a glance what a change adds and removes.
derived_by:
- SwRS-MDOKFSTUDIO-CODE-001
- SwRS-MDOKFSTUDIO-CODE-002
- SwRS-MDOKFSTUDIO-CODE-003
- SwRS-MDOKFSTUDIO-CODE-004
- SwRS-MDOKFSTUDIO-CODE-005
- SwRS-MDOKFSTUDIO-CODE-006
- SwRS-MDOKFSTUDIO-CODE-007
- SwRS-MDOKFSTUDIO-CODE-008
- SwRS-MDOKFSTUDIO-CODE-009
- SwRS-MDOKFSTUDIO-CODE-010
- SwRS-MDOKFSTUDIO-CODE-011
- SwRS-MDOKFSTUDIO-CODE-012
- SwRS-MDOKFSTUDIO-CODE-013
- SwRS-MDOKFSTUDIO-CODE-014
- SwRS-MDOKFSTUDIO-CODE-015
- SwRS-MDOKFSTUDIO-CODE-016
- SwRS-MDOKFSTUDIO-CODE-028
- SwRS-MDOKFSTUDIO-CODE-030
- SwRS-MDOKFSTUDIO-CODE-031
- SwRS-MDOKFSTUDIO-CODE-036
- SwRS-MDOKFSTUDIO-CODE-037
- SwRS-MDOKFSTUDIO-CODE-038
- SwRS-MDOKFSTUDIO-CODE-039
- SwRS-MDOKFSTUDIO-CODE-040
- SwRS-MDOKFSTUDIO-CORE-028
default_owner_email: gaetan@xeberon.net
---

## A reader reads highlighted, numbered and diff code

### Normative behavior

When a writer previews a document with a fenced code block, a diff or patch block or a MyST code directive, the Studio SHALL show the code literally, with syntax highlighting that follows the VS Code theme for a supported language, distinct treatments for added and deleted lines of a diff, and the line numbers, emphasized lines, file name and caption that a directive sets.

### Preserved stakeholder intent

Writers need code samples to read as they would in published documentation, in the language and colours of their editor. Reviewers need to see what a change adds and removes at a glance, and authors need listings that point readers at specific lines and name their source.

### Rationale and constraints

- Unsupported languages stay plain monospace text; the shared language list is not documented in docs/user/editing.md.
- A diff is a visualization only: no comparison and no per-line navigation. The literal markers stay in the text.
- Line numbers, emphasized lines, file names and captions apply to MyST code directives; plain fences are covered by the highlighted code samples.
