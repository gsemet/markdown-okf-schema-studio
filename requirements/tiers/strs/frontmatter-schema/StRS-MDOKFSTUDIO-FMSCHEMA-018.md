---
type: StRS
id: StRS-MDOKFSTUDIO-FMSCHEMA-018
uuid: 3253b51e-c0da-4e4b-9f13-d44fdc6d0de1
title: Frontmatter links can be followed
description: When a writer activates a resolving frontmatter link, the Studio
  SHALL open the target in the editor, at its marker line when the annotation
  defines one, and refuse unusable links with a reason.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: StRS
annotation_exemption: true
exemption_reason: "Superseded by StRS-MDOKFSTUDIO-FMSCHEMA-014; no marker expected."
derives_from: []
user_need: As a reviewer, I jump from a metadata reference to the file and line
  it names.
derived_by: []
superseded_by: StRS-MDOKFSTUDIO-FMSCHEMA-014
---

## Frontmatter links can be followed

### Normative behavior

When a writer activates a resolving frontmatter link, the Studio SHALL open the target in the editor, at its marker line when the annotation defines one, and refuse unusable links with a reason.

### Preserved stakeholder intent

Following a reference is the reason to declare it.

As a reviewer, I jump from a metadata reference to the file and line it names.

### Rationale and constraints

- Click or Enter in read mode, Cmd/Ctrl+click in edit mode; the query and fragment are kept and the jump is recorded in the Back/Next history.
- An invalid, unavailable or outside link is not followed and VS Code shows "Markdown OKF-Schema Studio could not follow the link: {reason}"; a malformed request shows "The frontmatter link request is invalid.". Filename-stem links are re-resolved at click time.
