---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-050
uuid: 06b0e883-3e72-435c-9a86-b5aab95c2829
title: Links resolve from the document, bundle or project root and stay inside
  it
description: When a link annotation has the resolution `document-relative`,
  `bundle-relative`, `bundle-relative-stem` or `project-relative`, the extension
  SHALL resolve the target from the folder of the document, the bundle root or
  the project root respectively, refuse an absolute target, and accept the
  target only when it names an existing file inside that root, a
  document-relative target being limited to the workspace folders unless
  `allowOutsideWorkspaceLinks` is true.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-014
depends_on:
- SwRS-MDOKFSTUDIO-FMSCHEMA-046
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/frontmatter/fileLinks.ts
tested_in_files:
- test/core/frontmatter/diagReq.frontmatter.requirements.test.ts
- test/core/frontmatter/fileLinks.test.ts
- test/core/frontmatter/okfFrontmatter.test.ts
---
## Links resolve from the document, bundle or project root and stay inside it

### Normative behavior

When a link annotation has the resolution `document-relative`, `bundle-relative`, `bundle-relative-stem` or `project-relative`, the extension SHALL resolve the target from the folder of the document, the bundle root or the project root respectively, refuse an absolute target, and accept the target only when it names an existing file inside that root, a document-relative target being limited to the workspace folders unless `allowOutsideWorkspaceLinks` is true.

### Scenario (nominal): Targets that resolve from their root

| Resolution | Setup | Outcome |
| --- | --- | --- |
| document-relative | Link t.md and t.md in the document's folder | The link is valid |
| bundle-relative | A bundle root holding docs/t.md and the value docs/t.md | The link is valid |
| bundle-relative-stem | The same bundle root and the value docs/t (`.md` is added to the target for the stem form) | The link is valid |
| project-relative | A project root and the value bundle/docs/t.md naming an existing file below it | The link is valid |

### Scenario (nominal): Default bundle and project roots

| Setting | Layout | Outcome |
| --- | --- | --- |
| `markdownOkfSchemaStudio.frontmatter.bundleRoot` empty | A schema folder bundle/_schema, a document in bundle/docs and a file bundle/index.md (`log.md` serves too) | A bundle-relative link resolves from the bundle folder: the parent of the schema folder is the bundle root when it contains the document and an `index.md` or `log.md` |
| `markdownOkfSchemaStudio.frontmatter.projectRoot` empty | A `.git` entry in a workspace folder above the document | A project-relative link resolves from the folder holding `.git`: the nearest folder with a `.git` entry above the document is the project root when it lies inside a workspace folder |

### Scenario (refusal): Missing file

- GIVEN a document-relative link nope.md that does not exist
- WHEN the document is analysed
- THEN the field carries [E10] target 'nope.md' does not resolve to a file at 'ref' and the label reads File not found

### Scenario (refusal): Absolute target

| Value | Resolution | Outcome |
| --- | --- | --- |
| /etc/hosts (POSIX) | any | [E10] absolute target '/etc/hosts' is not allowed at 'ref'; label Absolute paths are not allowed |
| C:/x.md (drive letter) | any | The same refusal is reported for the drive-letter path |
| A target starting with two backslashes (UNC) | any | Refused as UNC with the same error |

### Scenario (refusal): Bundle or project target leaves its root

| Input | Outcome |
| --- | --- |
| A bundle-relative value ../outside.md | [E10] target '../outside.md' escapes its bundle-relative root at 'ref'; label Outside the allowed folder |
| A file inside the root that is a symbolic link to a file outside it | Refused with the same kind of error ("escapes its {resolution} root") |
| A project-relative value that resolves outside the project root | Refused with the E10 error "escapes its project-relative root" |

### Scenario (boundary): Root unavailable

| Input | Outcome |
| --- | --- |
| A bundle-relative link, no configured bundle root, and no `index.md` or `log.md` in the parent of the schema folder | [W15] Skipped file-link check at 'ref': bundle-relative root is unavailable; label Link root unavailable |
| A project-relative link, no configured project root, and no folder with a `.git` entry above the document inside a workspace folder | The same warning W15 with "project-relative root is unavailable" |
| A project-relative link, no configured project root, and the nearest `.git` lies above the workspace folders | The same warning: an auto-detected git root outside the workspace is ignored |

### Related requirements

- SwRS-MDOKFSTUDIO-FMSCHEMA-060: the settings that replace the default roots and allow outside links.
- SwRS-MDOKFSTUDIO-FMSCHEMA-055: the filename-stem resolution.

### Verification notes

- Method: test/core/frontmatter/fileLinks.test.ts (sibling file, missing file, project root found, git root inside and outside the workspace, absolute and escaping targets), test/core/frontmatter/diagReq.frontmatter.requirements.test.ts (absolute target, parent traversal, symbolic link out), test/core/frontmatter/okfFrontmatter.test.ts (both bundle forms, convention bundle root, no bundle root).
- Criteria: Containment is checked on the path and again on the real path (symlinks). Without a workspace folder the navigation root is the document's folder. The project root is the configured one, else the nearest git root inside a workspace folder. Otherwise bundle-relative and project-relative links show the warning W15 with the label Link root unavailable.
