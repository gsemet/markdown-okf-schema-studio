---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-055
uuid: 1903d501-415c-4541-8c7f-eaa33a2a0875
title: A filename stem resolves when exactly one file matches
description: "When a link annotation has the resolution `filename-stem`, the extension
  SHALL look the stem up among the Markdown files under the workspace folders and
  the bundle root and accept it when exactly one file matches, reporting the E10 error
  \"is ambiguous\" or \"was not found\" for several files or none and the warning
  W15 for an unreadable candidate."
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-014
depends_on:
- SwRS-MDOKFSTUDIO-FMSCHEMA-050
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/frontmatter/fileLinks.ts
- src/core/frontmatter/stemIndex.ts
- src/session/hostEvents.ts
tested_in_files:
- test/core/frontmatter/okfFrontmatter.test.ts
- test/core/frontmatter/stemIndex.test.ts
- test/session/eventFanOut.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-FMSCHEMA-056
- SwRS-MDOKFSTUDIO-FMSCHEMA-057
- SwRS-MDOKFSTUDIO-FMSCHEMA-058
- SwRS-MDOKFSTUDIO-FMSCHEMA-059
---
## A filename stem resolves when exactly one file matches

### Normative behavior

When a link annotation has the resolution `filename-stem`, the extension SHALL look the stem up among the Markdown files under the workspace folders and the bundle root and accept it when exactly one file matches, reporting the E10 error "is ambiguous" or "was not found" for several files or none and the warning W15 for an unreadable candidate.

### Scenario (nominal): Unique stem

| Value | Setup | Outcome |
| --- | --- | --- |
| t | One file t.md below the workspace | The link is valid |
| t#h | The same file | The link is valid and keeps the fragment h |
| t | A file t.md created in a workspace folder after the stem was not found | The link is valid when the document is analysed again (the stem index is rebuilt) |

### Scenario (refusal): Ambiguous or unknown stem

| Value | Setup | Outcome |
| --- | --- | --- |
| same | Files docs/a/same.md and docs/b/same.md | [E10] filename stem 'same' is ambiguous at 'ref'; label Several files match |
| zzz | No such file | [E10] filename stem 'zzz' was not found at 'ref'; label File not found |
| same | A file Same.md only (stems are case-sensitive) | The stem is not found |

### Scenario (refusal): Unreadable candidate

- GIVEN a symbolic link ghost.md that points to a missing file and the value ghost
- WHEN the document is analysed
- THEN the field carries [W15] Skipped file-link check at 'ref': filename stem 'ghost' could not be resolved because the workspace may be unavailable and the label reads Link unavailable

### Scenario (nominal): Candidate becomes readable

- GIVEN the target of the symbolic link ghost.md is created
- WHEN the document is analysed again
- THEN the link is valid

### Scenario (boundary): Folders and files that the stem index covers

| Input | Outcome |
| --- | --- |
| Files named like stems inside node_modules, dist, out, output, _build, .venv, .git or a hidden folder (name starting with a dot) | None of them is found; the exclusion applies at every depth |
| A file in an ordinary folder | Its stem is found |
| A file whose name does not end in lowercase `.md`, or a symbolic link to a folder | Not indexed; symbolic links to folders are not entered |

### Scenario (nominal): Index follows the workspace

| Event | Outcome |
| --- | --- |
| A Markdown file is created, changed or deleted in a workspace folder | The filename-stem index is rebuilt (one Markdown watcher per workspace root invalidates the cached index of that root) |
| A workspace folder is added | It is followed by a new watcher |
| A workspace folder is removed | The watcher of that folder is disposed |

### Known issues

- Known issue: a bundle root outside the workspace folders is not watched: its index refreshes only when the root folder's own modification time changes, so new files in its sub-folders can be missed.

### Related requirements

- SwRS-MDOKFSTUDIO-FMSCHEMA-050: the other resolutions and their roots.

### Verification notes

- Method: test/core/frontmatter/okfFrontmatter.test.ts (unique stem, fragment, ambiguous and unknown stem, broken symbolic link, readable candidate), test/core/frontmatter/stemIndex.test.ts (unique stem, excluded folders, ordinary folder, unavailable flag, file created, folder removed, host events). The case "Same.md does not satisfy the stem same" has no test (untested).
- Method: test/session/eventFanOut.test.ts (saving a Markdown file keeps the cached index; creating or deleting one rebuilds it).
- Criteria: The cached index of a workspace root is invalidated by a created or deleted Markdown file, not by a change. The stem is the file name without .md; a match whose real path leaves its root is refused. A stale index is rebuilt once before the answer is given. An unreadable candidate is neither a match nor a not-found. The exclusion of node_modules, .git, _build, .venv, out, dist, output and dot-folders applies at every depth. Stems are compared case-sensitively and only files whose name ends in lowercase `.md` are indexed.
