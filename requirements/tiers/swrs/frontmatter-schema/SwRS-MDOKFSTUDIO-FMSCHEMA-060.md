---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-060
uuid: d672058b-a3f5-467f-948e-3e99e4aca0cb
title: The bundleRoot, projectRoot and allowOutsideWorkspaceLinks settings set
  the roots
description: When `markdownOkfSchemaStudio.frontmatter.bundleRoot` or
  `markdownOkfSchemaStudio.frontmatter.projectRoot` is a non-empty string, the
  extension SHALL use that folder as the bundle root or the project root, a
  relative path being taken from the first workspace folder, and let
  `markdownOkfSchemaStudio.frontmatter.allowOutsideWorkspaceLinks` decide
  whether a document-relative link may leave every workspace folder.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
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
- src/core/configuration/settingsRegistry.ts
- src/core/frontmatter/fileLinks.ts
tested_in_files:
- test/core/configuration/frontmatterConfiguration.test.ts
- test/core/frontmatter/fileLinks.test.ts
- test/core/frontmatter/okfFrontmatter.test.ts
---
## The bundleRoot, projectRoot and allowOutsideWorkspaceLinks settings set the roots

### Normative behavior

When `markdownOkfSchemaStudio.frontmatter.bundleRoot` or `markdownOkfSchemaStudio.frontmatter.projectRoot` is a non-empty string, the extension SHALL use that folder as the bundle root or the project root, a relative path being taken from the first workspace folder, and let `markdownOkfSchemaStudio.frontmatter.allowOutsideWorkspaceLinks` decide whether a document-relative link may leave every workspace folder.

### Scenario (nominal): Configured root

| Setting | Value | Link | Outcome |
| --- | --- | --- | --- |
| bundleRoot | bundle | A bundle-relative link docs/t.md | The link resolves from the bundle folder |
| projectRoot | The workspace folder | A project-relative link bundle/docs/t.md | The link is valid |

### Scenario (refusal): Configured root that cannot be used

| Setting | Value | Outcome |
| --- | --- | --- |
| bundleRoot | A folder that does not exist | The field carries the warning W15 "bundle-relative root is unavailable", with no fall back to the convention root |
| projectRoot | A folder that does not exist | The field carries the warning W15 "project-relative root is unavailable", with no fall back to the git root |
| either | Any value that is not a folder | Treated as unavailable, with the same warning |

### Scenario (boundary): Accepted values of the settings

| Setting | Rule |
| --- | --- |
| bundleRoot, projectRoot | String, default empty string; the value is trimmed; a relative path is taken from the first workspace folder; an absolute path is used as it is |
| allowOutsideWorkspaceLinks | Boolean, default false; only document-relative links are affected by it |

### Scenario (refusal): allowOutsideWorkspaceLinks false

- GIVEN a document-relative link ../../outside.md whose target is outside the workspace folder and the setting at its default false
- WHEN the document is analysed
- THEN the field carries [E10] target '../../outside.md' escapes its navigation root at 'ref' and the label reads Outside the allowed folder

### Scenario (nominal): allowOutsideWorkspaceLinks true or target inside the workspace

| Setting | Link | Outcome |
| --- | --- | --- |
| false | A document-relative link to a file inside the workspace folder | The link is valid |
| true | The link ../../outside.md whose target is outside the workspace folder | The link is valid and navigating to it is allowed |
| true | A bundle-relative link ../outside.md | The link is still refused as escaping its bundle-relative root |

### Known issues

- Known issue: a configured bundle root that does not exist is reported exactly like a missing convention root, without naming the setting.
- Known issue: one projectRoot value serves the whole workspace, so nested bundles cannot each have their own root, and the message does not name the root that was tried.

### Related requirements

- SwRS-MDOKFSTUDIO-FMSCHEMA-050: the resolution from the roots, and the default roots used when the settings are empty.

### Verification notes

- Method: test/core/configuration/frontmatterConfiguration.test.ts (accepted values and defaults of the settings, unusable root), test/core/frontmatter/okfFrontmatter.test.ts (configured bundle root, bundle root that does not exist), test/core/frontmatter/fileLinks.test.ts (configured project root, project root that does not exist, setting off, inside the workspace, setting on, other resolutions).
- Criteria: Default empty string for the two roots and false for the boolean; the value of a root is trimmed; an absolute path is used as it is; any non-folder value is treated as unavailable. Navigation with allowOutsideWorkspaceLinks on is not tested end to end (untested).
