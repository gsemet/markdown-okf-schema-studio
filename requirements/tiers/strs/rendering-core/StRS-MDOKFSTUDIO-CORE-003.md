---
type: StRS
id: StRS-MDOKFSTUDIO-CORE-003
uuid: 056076a8-38d3-4f28-bede-66a97220d9fd
title: See what the preview cannot render
description: When content cannot be rendered or loaded, the Studio SHALL show a
  visible placeholder or a listed warning instead of leaving a silent gap.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: Writers need to know what the preview leaves out, so that a gap is
  never mistaken for an empty result.
derived_by:
- SwRS-MDOKFSTUDIO-CORE-009
- SwRS-MDOKFSTUDIO-CORE-013
- SwRS-MDOKFSTUDIO-CORE-014
- SwRS-MDOKFSTUDIO-CORE-016
- SwRS-MDOKFSTUDIO-CORE-018
- SwRS-MDOKFSTUDIO-CORE-019
- SwRS-MDOKFSTUDIO-CORE-022
- SwRS-MDOKFSTUDIO-CORE-023
- SwRS-MDOKFSTUDIO-CORE-024
- SwRS-MDOKFSTUDIO-CORE-036
- SwRS-MDOKFSTUDIO-CORE-047
- SwRS-MDOKFSTUDIO-CORE-067
---

## See what the preview cannot render

### Normative behavior

When content cannot be rendered or loaded, the Studio SHALL show a visible placeholder or a listed warning instead of leaving a silent gap.

### Preserved stakeholder intent

Writers need to know what the preview leaves out, so that a gap is never mistaken for an empty result.

### Rationale and constraints

- Covers unresolved directives, citations, refused includes and missing images; the preview stays read-only about them.
