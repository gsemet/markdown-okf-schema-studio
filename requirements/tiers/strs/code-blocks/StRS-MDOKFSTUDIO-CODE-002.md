---
type: StRS
id: StRS-MDOKFSTUDIO-CODE-002
uuid: f9cd792d-09a6-477d-82e8-44228a00481f
title: Read diffs as additions and deletions
description: When a writer previews a diff or patch code block, the Studio SHALL
  show added lines and deleted lines with distinct treatments while keeping the
  literal markers.
project: markdown-okf-schema-studio
scope: code-blocks
lifecycle: superseded
origin: native
tier: StRS
annotation_exemption: true
exemption_reason: "Superseded by StRS-MDOKFSTUDIO-CODE-001; no marker expected."
derives_from: []
user_need: Reviewers need to see what a change adds and removes at a glance.
derived_by: []
superseded_by: StRS-MDOKFSTUDIO-CODE-001
default_owner_email: gaetan@xeberon.net
---

## Read diffs as additions and deletions

### Normative behavior

When a writer previews a diff or patch code block, the Studio SHALL show added lines and deleted lines with distinct treatments while keeping the literal markers.

### Preserved stakeholder intent

## User Need

Reviewers need to see what a change adds and removes at a glance.

### Rationale and constraints

- A diff is a visualization only: no comparison and no per-line navigation.
