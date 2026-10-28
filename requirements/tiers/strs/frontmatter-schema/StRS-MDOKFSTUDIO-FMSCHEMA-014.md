---
type: StRS
id: StRS-MDOKFSTUDIO-FMSCHEMA-014
uuid: 3ca5f672-1dfb-4a58-adbe-a8d8547a8158
title: Frontmatter link fields resolve, show their status and can be followed
description: When a schema annotates a field with x-okf-link, the Studio SHALL
  treat that field's values as links to files, resolve them from the matching
  root, show on each value whether it resolves and why not, show the linked
  file's evidence, and open a resolving link in the editor while refusing
  unusable links with a reason.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: proposed
origin: native
tier: StRS
derives_from: []
user_need: As a schema author, I declare that a field points to files so that
  writers get checked, navigable references; as a writer, I see at a glance
  which references are broken and why, and as a reviewer, I see key facts about
  a linked file without opening it and jump from a metadata reference to the
  file and line it names.
derived_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-039
- SwRS-MDOKFSTUDIO-FMSCHEMA-046
- SwRS-MDOKFSTUDIO-FMSCHEMA-047
- SwRS-MDOKFSTUDIO-FMSCHEMA-048
- SwRS-MDOKFSTUDIO-FMSCHEMA-049
- SwRS-MDOKFSTUDIO-FMSCHEMA-050
- SwRS-MDOKFSTUDIO-FMSCHEMA-051
- SwRS-MDOKFSTUDIO-FMSCHEMA-052
- SwRS-MDOKFSTUDIO-FMSCHEMA-053
- SwRS-MDOKFSTUDIO-FMSCHEMA-054
- SwRS-MDOKFSTUDIO-FMSCHEMA-055
- SwRS-MDOKFSTUDIO-FMSCHEMA-056
- SwRS-MDOKFSTUDIO-FMSCHEMA-057
- SwRS-MDOKFSTUDIO-FMSCHEMA-058
- SwRS-MDOKFSTUDIO-FMSCHEMA-059
- SwRS-MDOKFSTUDIO-FMSCHEMA-060
- SwRS-MDOKFSTUDIO-FMSCHEMA-061
- SwRS-MDOKFSTUDIO-FMSCHEMA-062
- SwRS-MDOKFSTUDIO-FMSCHEMA-063
- SwRS-MDOKFSTUDIO-FMSCHEMA-064
- SwRS-MDOKFSTUDIO-FMSCHEMA-065
- SwRS-MDOKFSTUDIO-FMSCHEMA-066
- SwRS-MDOKFSTUDIO-FMSCHEMA-067
- SwRS-MDOKFSTUDIO-FMSCHEMA-068
- SwRS-MDOKFSTUDIO-FMSCHEMA-069
- SwRS-MDOKFSTUDIO-FMSCHEMA-070
- SwRS-MDOKFSTUDIO-FMSCHEMA-071
- SwRS-MDOKFSTUDIO-FMSCHEMA-072
- SwRS-MDOKFSTUDIO-FMSCHEMA-073
- SwRS-MDOKFSTUDIO-FMSCHEMA-074
- SwRS-MDOKFSTUDIO-FMSCHEMA-079
- SwRS-MDOKFSTUDIO-FMSCHEMA-080
- SwRS-MDOKFSTUDIO-FMSCHEMA-081
- SwRS-MDOKFSTUDIO-FMSCHEMA-082
- SwRS-MDOKFSTUDIO-FMSCHEMA-083
- SwRS-MDOKFSTUDIO-FMSCHEMA-086
- SwRS-MDOKFSTUDIO-FMSCHEMA-087
- SwRS-MDOKFSTUDIO-TOOLBAR-113
default_owner_email: gaetan@xeberon.net
supersedes:
- StRS-MDOKFSTUDIO-FMSCHEMA-015
- StRS-MDOKFSTUDIO-FMSCHEMA-016
- StRS-MDOKFSTUDIO-FMSCHEMA-017
- StRS-MDOKFSTUDIO-FMSCHEMA-018
---

## Frontmatter link fields resolve, show their status and can be followed

### Normative behavior

When a schema annotates a field with x-okf-link, the Studio SHALL treat that field's values as links to files, resolve them from the matching root, show on each value whether it resolves and why not, show the linked file's evidence, and open a resolving link in the editor while refusing unusable links with a reason.

### Preserved stakeholder intent

As a schema author, I declare that a field points to files so that writers get checked, navigable references; as a writer, I see at a glance which references are broken and why, and as a reviewer, I see key facts about a linked file without opening it and jump from a metadata reference to the file and line it names.

### Rationale and constraints

- Annotations are found on top-level and nested properties, array items (items, prefixItems), patternProperties, additionalProperties, local references, every allOf branch, the matching anyOf branches, the single matching oneOf branch and the selected if/then/else branch; duplicate links are reported once and nested results attach to the top-level field.
- An invalid annotation (not an object, missing or unknown resolution or syntax, non-string markers, field lists that are not lists of names, non-boolean show_line_number) marks the field with "[E10] x-okf-link ... at '{field}'".
- A non-string value, a wikilink not written [[target]] or [[target|label]], or an empty target is an error; #fragment and ?query are split off and kept for navigation. Syntaxes are plain and wikilink.
- Modes: document-relative, bundle-relative and bundle-relative-stem (target plus .md), project-relative and filename-stem; absolute paths (POSIX, drive letter, UNC) are refused, and a bundle or project target that leaves its root, also through a symlink, is refused; a missing file reads "does not resolve to a file".
- filename-stem looks the stem up under the workspace folders and the bundle root: exactly one match is required ("is ambiguous" or "was not found"), a match leaving its root is refused and unreadable candidates give the warning W15. The stem index skips node_modules, .git, _build, .venv, out, dist, output and hidden folders and is rebuilt when a Markdown file changes in a workspace folder.
- Known issue: a bundle root outside the workspace is not watched, so new files in its sub-folders can be missed.
- The bundle root setting (string, empty by default) sets the bundle root, relative to the first workspace folder; empty uses the schema folder's parent when it contains the document and an index or log file; otherwise links show "Link root unavailable" (W15).
- Known issue: a configured bundle root that does not exist is reported the same way, without naming the setting.
- The project root setting (string, empty by default) sets the project root; empty uses the nearest folder with a .git entry above the document inside a workspace folder; otherwise "Link root unavailable".
- Known issue: the project root is one value for the whole workspace, and the message does not name the root tried.
- The outside-workspace links setting (boolean, off by default): off, a document-relative link outside every workspace folder is the error "Outside the allowed folder"; on, it resolves and can be followed.
- A resolving link shows as a link; otherwise the text shows with an error or warning mark and a plain label ("File not found", "Outside the allowed folder", "Link root unavailable", "Absolute paths are not allowed", "Several files match", "Empty link", "Invalid link" or "Link unavailable"), is keyboard-focusable, carries the full "[E10]" or "[W15]" message in its tooltip and counts in the badge. Link issues do not block saving other fields.
- Link inspection is deferred: the first paint shows each annotated value with a spinner and "File links are being resolved" (and no Studio link tooltip); about 150 ms after the render the host resolves the links and swaps the table in place; it waits while a block or field editor is open and drops stale results.
- Known issue: during the deferred first paint, native title attributes remain.
- The tooltip shows the workspace-relative target path then one "name: value" line per tooltip field found in the target's frontmatter; preview fields' values are shown beside the link as one excerpt (whitespace collapsed, joined by "; ", clipped with an ellipsis); only string, number and boolean values count and a target with a byte-order mark is read.
- With show_line_number on and a basename marker, the link shows "line N", the 1-based line of the first line carrying the marker and the document identity: the id marker field value, or the document's file name stem when the annotation names no id marker (an id marker naming a missing field gives no line); no matching line, no label.
- The metadata refreshes when a linked target is saved, created or deleted on disk, through a watcher per displayed target backed by the preview-wide file watcher.
- Known issue: a link whose annotation lists no tooltip field, no preview field and no show_line_number gets no watcher of its own and relies on the preview-wide watcher.
- Hovering or focusing a link (not while pending) shows a tooltip below or above it, never under the toolbar, of limited width, closing on Escape, scroll, resize, outside click or when pointer and focus leave.
- Click or Enter in read mode, Cmd/Ctrl+click in edit mode follows the link; the query and fragment are kept and the jump is recorded in the Back/Next history.
- An invalid, unavailable or outside link is not followed and VS Code shows "Markdown OKF-Schema Studio could not follow the link: {reason}"; a malformed request shows "The frontmatter link request is invalid.". Filename-stem links are re-resolved at click time.
