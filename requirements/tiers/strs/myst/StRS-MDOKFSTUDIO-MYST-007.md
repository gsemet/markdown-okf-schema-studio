---
type: StRS
id: StRS-MDOKFSTUDIO-MYST-007
uuid: 6dc4b21c-8a19-42ee-b55b-d508ae4d265e
title: Sphinx configuration gaps are reported before building
description: When a Sphinx project's configuration does not enable MyST syntax
  used in a document, the Studio SHALL tell the author which syntax is missing
  and where, through a non-intrusive closable banner that opens the Problems
  view, without running the configuration file.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a Sphinx author, I want to learn about unsupported syntax before
  building, through a quiet warning with a path to details, so that I avoid
  failed builds and can act without being interrupted.
derived_by:
- SwRS-MDOKFSTUDIO-CORE-064
- SwRS-MDOKFSTUDIO-MYST-030
- SwRS-MDOKFSTUDIO-MYST-066
- SwRS-MDOKFSTUDIO-MYST-067
- SwRS-MDOKFSTUDIO-MYST-068
- SwRS-MDOKFSTUDIO-MYST-069
- SwRS-MDOKFSTUDIO-MYST-070
- SwRS-MDOKFSTUDIO-MYST-071
- SwRS-MDOKFSTUDIO-MYST-072
- SwRS-MDOKFSTUDIO-MYST-073
- SwRS-MDOKFSTUDIO-MYST-074
- SwRS-MDOKFSTUDIO-MYST-075
- SwRS-MDOKFSTUDIO-MYST-076
- SwRS-MDOKFSTUDIO-MYST-077
- SwRS-MDOKFSTUDIO-MYST-078
- SwRS-MDOKFSTUDIO-MYST-079
- SwRS-MDOKFSTUDIO-MYST-080
- SwRS-MDOKFSTUDIO-MYST-081
- SwRS-MDOKFSTUDIO-MYST-082
- SwRS-MDOKFSTUDIO-MYST-083
- SwRS-MDOKFSTUDIO-MYST-084
- SwRS-MDOKFSTUDIO-MYST-085
- SwRS-MDOKFSTUDIO-MYST-086
- SwRS-MDOKFSTUDIO-MYST-089
---

## Sphinx configuration gaps are reported before building

### Normative behavior

When a Sphinx project's configuration does not enable MyST syntax used in a document, the Studio SHALL tell the author which syntax is missing and where, through a non-intrusive closable banner that opens the Problems view, without running the configuration file.

### Preserved stakeholder intent

As a Sphinx author, I want to learn about unsupported syntax before building so that I avoid failed builds, and I want a quiet warning with a path to details so that I can act without being interrupted.

### Rationale and constraints

- The configuration file is read as text and never executed.
- The banner can be closed and does not block editing; it also appears in Restricted Mode.
