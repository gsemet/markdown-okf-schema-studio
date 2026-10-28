---
type: StRS
id: StRS-MDOKFSTUDIO-CORE-003
uuid: 056076a8-38d3-4f28-bede-66a97220d9fd
title: A reader sees what cannot be rendered and keeps a usable preview
description: When content cannot be rendered or loaded, or a render fails, the
  Studio SHALL show a visible placeholder, a listed warning, the last good page
  marked as outdated or an error page with the failure message instead of a
  silent gap, and keep showing the previous page until a newer render is ready.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: proposed
origin: native
tier: StRS
derives_from: []
user_need: Writers need to know what the preview leaves out, so that a gap is
  never mistaken for an empty result, and need the preview to stay trustworthy
  while they type and when something goes wrong.
derived_by:
- SwRS-MDOKFSTUDIO-CORE-001
- SwRS-MDOKFSTUDIO-CORE-008
- SwRS-MDOKFSTUDIO-CORE-009
- SwRS-MDOKFSTUDIO-CORE-012
- SwRS-MDOKFSTUDIO-CORE-013
- SwRS-MDOKFSTUDIO-CORE-014
- SwRS-MDOKFSTUDIO-CORE-016
- SwRS-MDOKFSTUDIO-CORE-018
- SwRS-MDOKFSTUDIO-CORE-019
- SwRS-MDOKFSTUDIO-CORE-022
- SwRS-MDOKFSTUDIO-CORE-023
- SwRS-MDOKFSTUDIO-CORE-024
- SwRS-MDOKFSTUDIO-CORE-025
- SwRS-MDOKFSTUDIO-CORE-026
- SwRS-MDOKFSTUDIO-CORE-036
- SwRS-MDOKFSTUDIO-CORE-047
- SwRS-MDOKFSTUDIO-CORE-067
default_owner_email: gaetan@xeberon.net
---

## A reader sees what cannot be rendered and keeps a usable preview

### Normative behavior

When content cannot be rendered or loaded, or a render fails, the Studio SHALL show a visible placeholder, a listed warning, the last good page marked as outdated or an error page with the failure message instead of a silent gap, and keep showing the previous page until a newer render is ready.

### Preserved stakeholder intent

Writers need to know what the preview leaves out, so that a gap is never mistaken for an empty result. They also need the preview to stay trustworthy while they type and when something goes wrong.

### Rationale and constraints

- Covers unresolved directives, citations, refused includes and missing images; the preview stays read-only about them.
- When a render fails, the last good page stays visible and is marked as outdated, or an error page shows the failure message.
- A newer edit supersedes a render in progress; the previous page stays visible until a new one is ready.
