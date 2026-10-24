---
type: StRS
id: StRS-MDOKFSTUDIO-MYST-014
uuid: 3cd0ad80-09f2-42b6-bca1-e92b015ebc52
title: A closable banner warns about configuration syntax warnings
description: When the Sphinx configuration check finds syntax warnings, the
  Studio SHALL show a non-intrusive closable banner that opens the Problems
  view, including in Restricted Mode.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a Sphinx author, I want a quiet warning with a path to details so
  that I can act without being interrupted.
derived_by:
- SwRS-MDOKFSTUDIO-MYST-081
- SwRS-MDOKFSTUDIO-MYST-082
- SwRS-MDOKFSTUDIO-MYST-083
- SwRS-MDOKFSTUDIO-MYST-084
- SwRS-MDOKFSTUDIO-MYST-085
- SwRS-MDOKFSTUDIO-MYST-086
---

## A closable banner warns about configuration syntax warnings

### Normative behavior

When the Sphinx configuration check finds syntax warnings, the Studio SHALL show a non-intrusive closable banner that opens the Problems view, including in Restricted Mode.

### Preserved stakeholder intent

As a Sphinx author, I want a quiet warning with a path to details so that I can act without being interrupted.

### Rationale and constraints

- The banner can be closed and does not block editing; it also appears in Restricted Mode.
