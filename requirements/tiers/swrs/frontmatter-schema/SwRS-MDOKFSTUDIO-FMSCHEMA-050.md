---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-050
uuid: 06b0e883-3e72-435c-9a86-b5aab95c2829
title: "Links resolve from the configured or default root and stay inside it"
description: "When a link annotation has the resolution `document-relative`, `bundle-relative`,
  `bundle-relative-stem` or `project-relative`, the extension SHALL resolve the target
  from the folder of the document, the bundle root or the project root respectively,
  refuse an absolute target, and accept the target only when it names an existing
  file inside that root, a document-relative target being limited to the workspace
  folders unless `allowOutsideWorkspaceLinks` is true; a non-empty markdownOkfSchemaStudio.frontmatter.bundleRoot
  or projectRoot replaces the default root, a relative path being taken from the first
  workspace folder, and markdownOkfSchemaStudio.frontmatter.allowOutsideWorkspaceLinks
  decides whether a document-relative link may leave every workspace folder."
project: markdown-okf-schema-studio
scope: frontmatter-schema
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-014
depends_on:
- SwRS-MDOKFSTUDIO-FMSCHEMA-046
scenarios:
- id: S1
  title: Targets that resolve from their root
- id: S2
  title: Default bundle and project roots
- id: S3
  title: Missing file
- id: S4
  title: Absolute target
- id: S5
  title: Bundle or project target leaves its root
- id: S6
  title: Root unavailable
- id: S7
  title: Configured root
- id: S8
  title: Configured root that cannot be used
- id: S9
  title: Accepted values of the settings
- id: S10
  title: allowOutsideWorkspaceLinks false
- id: S11
  title: allowOutsideWorkspaceLinks true or target inside the workspace
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/configuration/settingsRegistry.ts
- src/core/frontmatter/fileLinks.ts
tested_in_files:
- test/core/configuration/frontmatterConfiguration.test.ts
- test/core/frontmatter/diagReq.frontmatter.requirements.test.ts
- test/core/frontmatter/fileLinks.test.ts
- test/core/frontmatter/okfFrontmatter.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-FMSCHEMA-051
- SwRS-MDOKFSTUDIO-FMSCHEMA-052
- SwRS-MDOKFSTUDIO-FMSCHEMA-053
- SwRS-MDOKFSTUDIO-FMSCHEMA-054
- SwRS-MDOKFSTUDIO-FMSCHEMA-060
- SwRS-MDOKFSTUDIO-FMSCHEMA-061
- SwRS-MDOKFSTUDIO-FMSCHEMA-062
- SwRS-MDOKFSTUDIO-FMSCHEMA-079
- SwRS-MDOKFSTUDIO-FMSCHEMA-080
- SwRS-MDOKFSTUDIO-FMSCHEMA-081
---
## Links resolve from the configured or default root and stay inside it

### Normative behavior

When a link annotation has the resolution `document-relative`, `bundle-relative`, `bundle-relative-stem` or `project-relative`, the extension SHALL resolve the target from the folder of the document, the bundle root or the project root respectively, refuse an absolute target, and accept the target only when it names an existing file inside that root, a document-relative target being limited to the workspace folders unless `allowOutsideWorkspaceLinks` is true; a non-empty markdownOkfSchemaStudio.frontmatter.bundleRoot or projectRoot replaces the default root, a relative path being taken from the first workspace folder, and markdownOkfSchemaStudio.frontmatter.allowOutsideWorkspaceLinks decides whether a document-relative link may leave every workspace folder.

### Scenario S1 (nominal): Targets that resolve from their root

| Resolution | Setup | Outcome |
| --- | --- | --- |
| document-relative | Link t.md and t.md in the document's folder | The link is valid |
| bundle-relative | A bundle root holding docs/t.md and the value docs/t.md | The link is valid |
| bundle-relative-stem | The same bundle root and the value docs/t (`.md` is added to the target for the stem form) | The link is valid |
| project-relative | A project root and the value bundle/docs/t.md naming an existing file below it | The link is valid |

### Scenario S2 (nominal): Default bundle and project roots

| Setting | Layout | Outcome |
| --- | --- | --- |
| `markdownOkfSchemaStudio.frontmatter.bundleRoot` empty | A schema folder bundle/_schema, a document in bundle/docs and a file bundle/index.md (`log.md` serves too) | A bundle-relative link resolves from the bundle folder: the parent of the schema folder is the bundle root when it contains the document and an `index.md` or `log.md` |
| `markdownOkfSchemaStudio.frontmatter.projectRoot` empty | A `.git` entry in a workspace folder above the document | A project-relative link resolves from the folder holding `.git`: the nearest folder with a `.git` entry above the document is the project root when it lies inside a workspace folder |

### Scenario S3 (refusal): Missing file

- GIVEN a document-relative link nope.md that does not exist
- WHEN the document is analysed
- THEN the field carries [E10] target 'nope.md' does not resolve to a file at 'ref' and the label reads File not found

### Scenario S4 (refusal): Absolute target

| Value | Resolution | Outcome |
| --- | --- | --- |
| /etc/hosts (POSIX) | any | [E10] absolute target '/etc/hosts' is not allowed at 'ref'; label Absolute paths are not allowed |
| C:/x.md (drive letter) | any | The same refusal is reported for the drive-letter path |
| A target starting with two backslashes (UNC) | any | Refused as UNC with the same error |

### Scenario S5 (refusal): Bundle or project target leaves its root

| Input | Outcome |
| --- | --- |
| A bundle-relative value ../outside.md | [E10] target '../outside.md' escapes its bundle-relative root at 'ref'; label Outside the allowed folder |
| A file inside the root that is a symbolic link to a file outside it | Refused with the same kind of error ("escapes its {resolution} root") |
| A project-relative value that resolves outside the project root | Refused with the E10 error "escapes its project-relative root" |

### Scenario S6 (boundary): Root unavailable

| Input | Outcome |
| --- | --- |
| A bundle-relative link, no configured bundle root, and no `index.md` or `log.md` in the parent of the schema folder | [W15] Skipped file-link check at 'ref': bundle-relative root is unavailable; label Link root unavailable |
| A project-relative link, no configured project root, and no folder with a `.git` entry above the document inside a workspace folder | The same warning W15 with "project-relative root is unavailable" |
| A project-relative link, no configured project root, and the nearest `.git` lies above the workspace folders | The same warning: an auto-detected git root outside the workspace is ignored |

### Scenario S7 (nominal): Configured root

| Setting | Value | Link | Outcome |
| --- | --- | --- | --- |
| bundleRoot | bundle | A bundle-relative link docs/t.md | The link resolves from the bundle folder |
| projectRoot | The workspace folder | A project-relative link bundle/docs/t.md | The link is valid |

### Scenario S8 (refusal): Configured root that cannot be used

| Setting | Value | Outcome |
| --- | --- | --- |
| bundleRoot | A folder that does not exist | The field carries the warning W15 "bundle-relative root is unavailable", with no fall back to the convention root |
| projectRoot | A folder that does not exist | The field carries the warning W15 "project-relative root is unavailable", with no fall back to the git root |
| either | Any value that is not a folder | Treated as unavailable, with the same warning |

### Scenario S9 (boundary): Accepted values of the settings

| Setting | Rule |
| --- | --- |
| bundleRoot, projectRoot | String, default empty string; the value is trimmed; a relative path is taken from the first workspace folder; an absolute path is used as it is |
| allowOutsideWorkspaceLinks | Boolean, default false; only document-relative links are affected by it |

### Scenario S10 (refusal): allowOutsideWorkspaceLinks false

- GIVEN a document-relative link ../../outside.md whose target is outside the workspace folder and the setting at its default false
- WHEN the document is analysed
- THEN the field carries [E10] target '../../outside.md' escapes its navigation root at 'ref' and the label reads Outside the allowed folder

### Scenario S11 (nominal): allowOutsideWorkspaceLinks true or target inside the workspace

| Setting | Link | Outcome |
| --- | --- | --- |
| false | A document-relative link to a file inside the workspace folder | The link is valid |
| true | The link ../../outside.md whose target is outside the workspace folder | The link is valid and navigating to it is allowed |
| true | A bundle-relative link ../outside.md | The link is still refused as escaping its bundle-relative root |

### Known issues

- Known issue: a configured bundle root that does not exist is reported exactly like a missing convention root, without naming the setting.
- Known issue: one projectRoot value serves the whole workspace, so nested bundles cannot each have their own root, and the message does not name the root that was tried.

### Related requirements

- SwRS-MDOKFSTUDIO-FMSCHEMA-055: the filename-stem resolution.

### Verification notes

- Method: test/core/frontmatter/fileLinks.test.ts (sibling file, missing file, project root found, git root inside and outside the workspace, absolute and escaping targets), test/core/frontmatter/diagReq.frontmatter.requirements.test.ts (absolute target, parent traversal, symbolic link out), test/core/frontmatter/okfFrontmatter.test.ts (both bundle forms, convention bundle root, no bundle root).
- Criteria: Containment is checked on the path and again on the real path (symlinks). Without a workspace folder the navigation root is the document's folder. The project root is the configured one, else the nearest git root inside a workspace folder. Otherwise bundle-relative and project-relative links show the warning W15 with the label Link root unavailable.
- Method: test/core/configuration/frontmatterConfiguration.test.ts (accepted values and defaults of the settings, unusable root), test/core/frontmatter/okfFrontmatter.test.ts (configured bundle root, bundle root that does not exist), test/core/frontmatter/fileLinks.test.ts (configured project root, project root that does not exist, setting off, inside the workspace, setting on, other resolutions).
- Criteria: Default empty string for the two roots and false for the boolean; the value of a root is trimmed; an absolute path is used as it is; any non-folder value is treated as unavailable. Navigation with allowOutsideWorkspaceLinks on is not tested end to end (untested).

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMSCHEMA-014](../../strs/frontmatter-schema/StRS-MDOKFSTUDIO-FMSCHEMA-014.md): Frontmatter link fields resolve, show their status and can be followed
- Depends on:
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-046](SwRS-MDOKFSTUDIO-FMSCHEMA-046.md): x-okf-link annotations declare link fields and their syntax
- Supersedes:
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-051](SwRS-MDOKFSTUDIO-FMSCHEMA-051.md): Bundle-relative links resolve from the bundle root
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-052](SwRS-MDOKFSTUDIO-FMSCHEMA-052.md): Project-relative links resolve from the project root
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-053](SwRS-MDOKFSTUDIO-FMSCHEMA-053.md): Absolute link targets are refused
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-054](SwRS-MDOKFSTUDIO-FMSCHEMA-054.md): Bundle and project targets cannot leave their root
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-060](SwRS-MDOKFSTUDIO-FMSCHEMA-060.md): The bundleRoot, projectRoot and allowOutsideWorkspaceLinks settings set the roots
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-061](SwRS-MDOKFSTUDIO-FMSCHEMA-061.md): The projectRoot setting sets the project root
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-062](SwRS-MDOKFSTUDIO-FMSCHEMA-062.md): The allowOutsideWorkspaceLinks setting default refuses outside links
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-079](SwRS-MDOKFSTUDIO-FMSCHEMA-079.md): The bundle root defaults to the schema folder's parent
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-080](SwRS-MDOKFSTUDIO-FMSCHEMA-080.md): The project root defaults to the nearest git root
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-081](SwRS-MDOKFSTUDIO-FMSCHEMA-081.md): The allowOutsideWorkspaceLinks setting set to true allows outside links
<!-- okf:links:end -->
