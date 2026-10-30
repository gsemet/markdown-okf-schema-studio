---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-094
uuid: d59d118d-0893-4343-8ad2-60079a6938f6
title: "A local link target must be a regular file inside the workspace"
description: "When a relative Markdown link is followed, the extension SHALL open
  its target only when the target is a regular file whose path and real path are below
  a workspace root, and block every other link with the reason of the first check
  that failed."
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-011
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/session/previewNavigator.ts
tested_in_files:
- test/session/previewNavigator.test.ts
- test/session/toolbarReq.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## A local link target must be a regular file inside the workspace

### Normative behavior

When a relative Markdown link is followed, the extension SHALL open its target only when the target is a regular file whose path and real path are below a workspace root, and block every other link with the reason of the first check that failed.

### Scenario (nominal): A file below a root opens

| Input | Outcome |
| --- | --- |
| ../docs/target.md?view=1#heading from chapters/active.md, with docs/target.md below the root | opens the real path of the file with the suffix ?view=1#heading |
| a link that resolves below the second folder of a workspace of two folders | opens, because each root is tried before the link is blocked |
| a link to a symlink inside the workspace that points to a file inside the workspace | opens the real path of the file |

### Scenario (refusal): A path outside every root

- GIVEN a link ../secret.md from a file at the root of the workspace
- WHEN it is resolved
- THEN it is blocked with The navigation target is outside the workspace.

### Scenario (refusal): A symbolic link out of the workspace

- GIVEN a link to a symlink inside the workspace that points to a file outside it
- WHEN the link is resolved
- THEN it is blocked with The navigation target escapes the workspace.

### Scenario (refusal): A target that is missing or not a regular file

| Input | Outcome |
| --- | --- |
| a link to missing.md | blocked with The navigation target is unavailable. |
| a link to a folder | blocked with The navigation target is not a regular file. |

### Related requirements

- SwRS-MDOKFSTUDIO-TOOLBAR-077: the reason of a blocked link is shown as a warning
- SwRS-MDOKFSTUDIO-FMSCHEMA-060: a frontmatter link may leave the roots only with the opt-in setting
- SwRS-MDOKFSTUDIO-FMSCHEMA-050: the roots a frontmatter link resolves from, and the symlink case of the frontmatter path
- SwRS-MDOKFSTUDIO-TRUST-007: the roots a read-only preview allows

### Verification notes

- Method: test/session/previewNavigator.test.ts (nominal row 1: classifies anchors, external links, and workspace-local files; refusal outside every root: blocks unsafe anchors, schemes, and paths, ../secret.md blocked; the second-root relative case is untested, the wikilink test searches every root)
- Method: test/session/toolbarReq.requirements.test.ts (nominal symlink inside, refusal symbolic link out: a symbolic link out of the workspace is blocked; refusal missing or not a regular file: a target that is missing or not a regular file is blocked)
- Method: the integration test test/integration/previewEditing.test.ts (bundle_target symlink) covers the frontmatter path, which answers outside the workspace
- Criteria: The check compares the lexical path with each root, then the real path of the target with the real path of the root; the kind of the target must be file.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-011](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-011.md): Links open the right target, show where they lead, or are refused with a reason
<!-- okf:links:end -->
