---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-098
uuid: 19f4b0f9-5a01-4917-ab7e-cd42c69571f5
title: "A wikilink is found by file name, or refused when ambiguous or empty"
description: "When a wikilink is followed, the extension SHALL search every workspace
  root for a note of that file name (with .md added when the name has no extension)
  and open it when exactly one valid file matches, or the file of that name next to
  the document when none is found, and block the link when several match or no file
  does."
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
- src/session/features/links.ts
- src/session/previewNavigator.ts
tested_in_files:
- test/session/previewNavigator.test.ts
- test/session/toolbarReq.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## A wikilink is found by file name, or refused when ambiguous or empty

### Normative behavior

When a wikilink is followed, the extension SHALL search every workspace root for a note of that file name (with .md added when the name has no extension) and open it when exactly one valid file matches, or the file of that name next to the document when none is found, and block the link when several match or no file does.

### Scenario (nominal): One match

- GIVEN a note named Note.md in one folder of a two-folder workspace
- WHEN the link [[Note]] is followed
- THEN that file opens, because the search by name runs before any sibling is accepted

### Scenario (nominal): Sibling fallback

- GIVEN no file found by name and a Note.md next to the document
- WHEN the link [[Note]] is followed
- THEN the sibling opens

### Scenario (boundary): Name with or without an extension, with or without a folder

| Input | Outcome |
| --- | --- |
| [[Note]] | the name searched is Note.md |
| [[data.txt]] | searched with the name unchanged, because the name already has an extension |
| [[notes v1.2]] | searched with the name unchanged, because the name already has an extension |
| [[sub/Note]] with a file sub/Note.md next to the document | opens it without a name search, because a name with a folder resolves relative only |
| [[sub/Note]] and no file sub/Note.md next to the document | blocked with The wikilink target is unavailable. |

### Scenario (refusal): Several files match

- GIVEN Note.md in two folders
- WHEN [[Note]] is followed
- THEN it is blocked with The wikilink is ambiguous; use a relative path to choose a note.

### Scenario (refusal): No file matches

- GIVEN [[Missing]]
- WHEN it is followed
- THEN it is blocked with The wikilink target is unavailable.

### Scenario (boundary): A match outside the workspace does not count

- GIVEN one match inside the workspace and one outside through a symlink
- WHEN [[Note]] is followed
- THEN only the valid match counts and it opens

### Scenario (boundary): One search per name at a time

| Input | Outcome |
| --- | --- |
| two discovery requests for [[Note]] resolved together | one file search runs and both share its result |
| a request after the search ended | a new search runs |

### Related requirements

- SwRS-MDOKFSTUDIO-TOOLBAR-094: the opened file must be a regular file inside the workspace
- SwRS-MDOKFSTUDIO-TOOLBAR-077: the reason of a blocked link is shown as a warning

### Verification notes

- Method: test/session/previewNavigator.test.ts (one match, sibling fallback and search first: discovers bare wikilinks before accepting an active-root sibling and searches every workspace root and blocks cross-root wikilink ambiguity; ambiguous, match outside the workspace, unavailable and the folder part found without a new search: discovers wikilinks on demand and refuses ambiguous or escaping targets; the dotted-name rows and the blocked folder-part row are untested)
- Method: test/session/toolbarReq.requirements.test.ts (one search per name at a time: one search per wikilink name runs at a time)
- Criteria: One candidate after validation opens; more than one candidate is blocked; no candidate falls back to the file next to the document; the running searches are kept in a map by name.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-011](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-011.md): Links open the right target, show where they lead, or are refused with a reason
<!-- okf:links:end -->
