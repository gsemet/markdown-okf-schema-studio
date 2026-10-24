---
type: StRS
id: StRS-MDOKFSTUDIO-MYST-002
uuid: fa6be311-f482-47a1-a40c-b3ff4c1f860b
title: Context tags render as readable panels
description: When a writer pastes prompt-style context tags, the Studio SHALL
  show each as a readable panel and SHALL NOT lose its content or run it as
  HTML.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I want pasted context tags to stay readable and inert so
  that I never lose text or run active markup.
derived_by:
- SwRS-MDOKFSTUDIO-CORE-045
- SwRS-MDOKFSTUDIO-MYST-013
- SwRS-MDOKFSTUDIO-MYST-014
- SwRS-MDOKFSTUDIO-MYST-015
- SwRS-MDOKFSTUDIO-MYST-016
---

## Context tags render as readable panels

### Normative behavior

When a writer pastes prompt-style context tags, the Studio SHALL show each as a readable panel and SHALL NOT lose its content or run it as HTML.

### Preserved stakeholder intent

As a writer, I want pasted context tags to stay readable and inert so that I never lose text or run active markup.

### Rationale and constraints

- Pasted text is shown as a panel, never executed; unknown tags stay visible as text.
