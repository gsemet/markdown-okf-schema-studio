---
type: StRS
id: StRS-MDOKFSTUDIO-MYST-012
uuid: 2bca15d5-215d-4915-91e2-f067ec97a862
title: A toctree shows the linked documents and marks missing ones
description: When a document contains a table of contents directive, the Studio
  SHALL list the documents it names as links and mark missing ones.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I want to see the document tree I declared so that I can
  catch missing pages.
derived_by:
- SwRS-MDOKFSTUDIO-CORE-054
- SwRS-MDOKFSTUDIO-CORE-055
- SwRS-MDOKFSTUDIO-MYST-057
- SwRS-MDOKFSTUDIO-MYST-058
- SwRS-MDOKFSTUDIO-MYST-059
- SwRS-MDOKFSTUDIO-MYST-060
- SwRS-MDOKFSTUDIO-MYST-061
- SwRS-MDOKFSTUDIO-MYST-062
---

## A toctree shows the linked documents and marks missing ones

### Normative behavior

When a document contains a table of contents directive, the Studio SHALL list the documents it names as links and mark missing ones.

### Preserved stakeholder intent

As a writer, I want to see the document tree I declared so that I can catch missing pages.

### Rationale and constraints

- Documents that do not exist are marked, not silently dropped.
