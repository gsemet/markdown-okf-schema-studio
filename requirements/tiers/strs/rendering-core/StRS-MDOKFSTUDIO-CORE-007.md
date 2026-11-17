---
type: StRS
id: StRS-MDOKFSTUDIO-CORE-007
uuid: abf10eb3-4973-4c80-aca7-a5bba4616dd4
title: A maintainer ships a version only after green checks and reviewed release
  notes
description: When a maintainer tags a version, the Studio release process SHALL
  proceed only after the heavy CI run is green, with manifests that carry the
  package version and reviewed release notes.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: A maintainer ships a version only after the heavy CI run is green,
  with manifests at the package version and reviewed release notes.
derived_by:
- SwRS-MDOKFSTUDIO-CORE-075
- SwRS-MDOKFSTUDIO-CORE-076
- SwRS-MDOKFSTUDIO-CORE-078
default_owner_email: gaetan@xeberon.net
---

## A maintainer ships a version only after green checks and reviewed release notes

### Normative behavior

When a maintainer tags a version, the Studio release process SHALL proceed only after the heavy CI run is green, with manifests that carry the package version and reviewed release notes.

### Preserved stakeholder intent

A maintainer ships a version only after the heavy CI run of the commit is green, with every manifest at the package version and reviewed release notes.

### Rationale and constraints

- The version commit writes one version to every manifest, and the repository check fails on drift.
- CI tags the version change only after the green heavy run of that commit.
- A version without its reviewed release notes does not ship.

### Main paths

#### Path 1: Ship a version

1. A maintainer sets a release version
   - SwRS-MDOKFSTUDIO-CORE-075: every manifest holds the package version in one version commit
2. The version commit has a green heavy run
   - SwRS-MDOKFSTUDIO-CORE-076: CI tags the version change only after that run
3. The tagged version has release notes
   - SwRS-MDOKFSTUDIO-CORE-078: the version ships only with its reviewed release notes

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-CORE-075](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-075.md): Plugin manifest versions equal the package version
  - [SwRS-MDOKFSTUDIO-CORE-076](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-076.md): CI tags a version change only after a green heavy run of the commit
  - [SwRS-MDOKFSTUDIO-CORE-078](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-078.md): A version ships only with its reviewed release notes
<!-- okf:links:end -->
