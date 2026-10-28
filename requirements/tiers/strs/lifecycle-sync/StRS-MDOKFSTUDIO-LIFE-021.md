---
type: StRS
id: StRS-MDOKFSTUDIO-LIFE-021
uuid: a594cfcd-a051-49c0-9995-858580e39c96
title: The settings editor lists the Studio settings in clear groups
description: When a reader opens the Studio settings in the settings editor, the
  Studio SHALL list them in titled groups, each in a fixed order, with their
  defaults and descriptions.
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: proposed
origin: native
tier: StRS
derives_from: []
user_need: As a reader, I find every Studio setting in the settings editor,
  grouped by what it controls, with a default and an explanation.
derived_by:
- SwRS-MDOKFSTUDIO-LIFE-069
- SwRS-MDOKFSTUDIO-LIFE-097
- SwRS-MDOKFSTUDIO-LIFE-156
- SwRS-MDOKFSTUDIO-TRUST-073
default_owner_email: gaetan@xeberon.net
---

## The settings editor lists the Studio settings in clear groups

### Normative behavior

When a reader opens the Studio settings in the settings editor, the Studio SHALL list them in titled groups, each in a fixed order, with their defaults and descriptions.

### Preserved stakeholder intent

As a reader, I find every Studio setting in the settings editor, grouped by what it controls, with a default and an explanation.

### Rationale and constraints

- A setting that is not set reads as its default; a stored value of the wrong type is normalized.
