---
type: StRS
id: StRS-MDOKFSTUDIO-TRUST-001
uuid: ac15f392-751d-459b-bc19-b98f630f2348
title: A document opens editable whatever the trust, with narrow reads outside a
  trusted folder
description: When a reader previews a document in an untrusted workspace or a
  file outside every workspace folder, the Studio SHALL keep the document
  editable exactly as in a trusted workspace, and narrow only what the preview
  reads, while features that need trust stay off with their reason.
project: markdown-okf-schema-studio
scope: trust-security
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I open a document in Restricted Mode, or a file from
  outside my workspace, and edit it as I do anywhere else; the preview reads no
  more than the folder of the document, and I am told why a feature that needs
  trust is off.
derived_by:
- SwRS-MDOKFSTUDIO-LIFE-026
- SwRS-MDOKFSTUDIO-TRUST-001
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-006
default_owner_email: gaetan@xeberon.net
---

## A document opens editable whatever the trust, with narrow reads outside a trusted folder

### Normative behavior

When a reader previews a document in an untrusted workspace or a file outside every workspace folder, the Studio SHALL keep the document editable exactly as in a trusted workspace (edit mode, block, table and frontmatter edits, checkboxes, comments, image paste), and SHALL narrow only what the preview reads, while features that need trust stay off and give their reason where they are used.

### Preserved stakeholder intent

As a writer, I open a document in Restricted Mode, or a file from outside my workspace, and edit it as I do anywhere else; the preview reads no more than the folder of the document, and I am told why a feature that needs trust is off.

### Rationale and constraints

- Other VS Code editors edit in an untrusted workspace, so trust never makes a document read-only; only a file that VS Code itself holds read-only stays read-only, with its own reason.
- Restricted Mode and a file outside every workspace folder share one preview with restricted reads: includes and resources come from the folder of the document, no path below a dot-directory is read and no schema is looked up.
- A preview that is open when the user trusts the workspace is covered by SwRS-MDOKFSTUDIO-TRUST-001.
- This record holds the rule that applies to every kind of change. The wording of each refusal that remains is specified with the feature that owns the action (block editing, table editing, frontmatter editing, labels, checkboxes, images, comments).
- A feature that needs trust, such as PlantUML with Java or the citation list, is disabled with its reason; there is no banner.
- The viewing actions (zoom, theme, links, code copy) are specified in the theme and zoom, toolbar and navigation, and code block scopes.

### Main paths

#### Path 1: Edit in an untrusted workspace

1. A preview is created for a document in no workspace folder, or in an untrusted workspace
   - SwRS-MDOKFSTUDIO-TRUST-001: every affordance that edits, comments or changes the document is kept, as in a trusted workspace
   - Option SwRS-MDOKFSTUDIO-TRUST-001 (boundary): a feature that needs trust stays disabled and gives its reason
2. The document is editable
   - SwRS-MDOKFSTUDIO-TRUST-005: a write request for the render the host holds is handled as for a trusted workspace
   - Option SwRS-MDOKFSTUDIO-TRUST-005 (refusal): the citation list needs a trusted workspace folder and the refusal names its cause
3. The edit is written to the document

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-LIFE-026](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-026.md): The side preview follows the active Markdown editor
  - [SwRS-MDOKFSTUDIO-TRUST-001](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-001.md): A document is editable whatever the trust; only its reads are restricted
  - [SwRS-MDOKFSTUDIO-TRUST-005](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-005.md): The host handles the write requests of every preview, whatever the trust
  - [SwRS-MDOKFSTUDIO-TRUST-006](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-006.md): A preview with restricted reads keeps every viewing action
<!-- okf:links:end -->
