---
type: StRS
id: StRS-MDOKFSTUDIO-FMSCHEMA-015
uuid: 22811d37-4a4b-4d79-90b8-3b9c0984198b
title: Links resolve against the right root
description: When a frontmatter link value is checked, the Studio SHALL resolve
  it by the annotation's resolution mode from the matching root and refuse
  targets outside the allowed folders.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I can trust that a link which shows as valid points to
  the intended file.
derived_by:
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
- SwRS-MDOKFSTUDIO-FMSCHEMA-079
- SwRS-MDOKFSTUDIO-FMSCHEMA-080
- SwRS-MDOKFSTUDIO-FMSCHEMA-081
---

## Links resolve against the right root

### Normative behavior

When a frontmatter link value is checked, the Studio SHALL resolve it by the annotation's resolution mode from the matching root and refuse targets outside the allowed folders.

### Preserved stakeholder intent

Several projects organise files differently; the mode and roots must match their layout without escaping their folders.

As a writer, I can trust that a link which shows as valid points to the intended file.

### Rationale and constraints

- Modes: `document-relative`, `bundle-relative` and `bundle-relative-stem` (target plus `.md`), `project-relative` and `filename-stem`; absolute paths (POSIX, drive letter, UNC) are refused, and a bundle or project target that leaves its root, also through a symlink, is refused; a missing file reads "does not resolve to a file".
- `filename-stem` looks the stem up under the workspace folders and the bundle root: exactly one match is required ("is ambiguous" or "was not found"), a match leaving its root is refused and unreadable candidates give the warning W15. The stem index skips `node_modules`, `.git`, `_build`, `.venv`, `out`, `dist`, `output` and hidden folders and is rebuilt when a Markdown file changes in a workspace folder. Known issue: a bundle root outside the workspace is not watched, so new files in its sub-folders can be missed.
- `frontmatter.bundleRoot` (string, empty by default) sets the bundle root, relative to the first workspace folder; empty uses the schema folder's parent when it contains the document and an `index.md` or `log.md`; otherwise links show "Link root unavailable" (W15). Known issue: a configured root that does not exist is reported the same way, without naming the setting.
- `frontmatter.projectRoot` (string, empty by default) sets the project root; empty uses the nearest folder with a `.git` entry above the document inside a workspace folder; otherwise "Link root unavailable". Known issue: one value for the whole workspace, and the message does not name the root tried.
- `frontmatter.allowOutsideWorkspaceLinks` (boolean, off by default): off, a document-relative link outside every workspace folder is the error "Outside the allowed folder"; on, it resolves and can be followed.
