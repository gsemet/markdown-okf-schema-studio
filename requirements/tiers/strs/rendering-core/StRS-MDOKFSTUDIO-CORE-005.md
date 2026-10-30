---
type: StRS
id: StRS-MDOKFSTUDIO-CORE-005
uuid: 4cdba31f-2a8a-4a82-b419-a375ed2a5aee
title: Keep the preview usable when a render fails
description: When a render fails, the Studio SHALL keep the last good page
  marked as outdated or show an error page with the failure message, and when a
  newer edit supersedes a render, the Studio SHALL keep showing the previous
  page until the newer render is ready.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: superseded
status: deprecated
origin: native
tier: StRS
derives_from: []
user_need: Writers need the preview to stay trustworthy while they type and when
  something goes wrong.
derived_by: []
superseded_by:
- StRS-MDOKFSTUDIO-CORE-003
default_owner_email: gaetan@xeberon.net
---

## Keep the preview usable when a render fails

### Normative behavior

When a render fails, the Studio SHALL keep the last good page marked as outdated or show an error page with the failure message, and when a newer edit supersedes a render, the Studio SHALL keep showing the previous page until the newer render is ready.

### Preserved stakeholder intent

Writers need the preview to stay trustworthy while they type and when something goes wrong.

### Rationale and constraints

- A newer edit supersedes a render in progress; the previous page stays visible until a new one is ready.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Superseded by:
  - [StRS-MDOKFSTUDIO-CORE-003](StRS-MDOKFSTUDIO-CORE-003.md): A reader sees what cannot be rendered and keeps a usable preview
<!-- okf:links:end -->
