---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-075
uuid: e6ca9a20-ca0d-448d-adaf-4f9e3f1e208b
title: Plugin manifest versions equal the package version
description: When a release version is set, the version script SHALL write the
  same version to package.json, package-lock.json and every plugin manifest in
  one signed-off commit, and the repository check SHALL fail when any manifest
  version differs from package.json.
project: MDOKFSTUDIO
scope: rendering-core
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: true
exemption_reason: Implemented in scripts/version.py, which is outside the
  scanned source directories; verified by test_release.py and
  test_plugin_manifests.py.
derived_by: []
implemented_in_files: []
tested_in_files:
- test/build/test_plugin_manifests.py
- test/build/test_release.py
default_owner_email: gaetan@xeberon.net
---

## Plugin manifest versions equal the package version

### Normative behavior

When a release version is set, the version script SHALL write the same version to package.json, package-lock.json and every plugin manifest in one signed-off commit, and the repository check SHALL fail when any manifest version differs from package.json.

### Scenario (nominal): The version commit updates every manifest

- GIVEN a repository whose `package.json`, `package-lock.json`, `plugin.json` and `.claude-plugin/plugin.json` hold the same version and have no uncommitted edit
- WHEN `scripts/version.py` sets or computes the next version
- THEN the four files hold the new version and one signed-off commit `chore: version X.Y.Z` contains exactly those four files, without a tag

### Scenario (boundary): Drift and dirty manifests

| Input | Outcome |
| --- | --- |
| a plugin manifest `version` differs from `package.json` | the repository check fails |
| a marketplace plugin entry pins a version other than the package version | the repository check fails |
| a plugin manifest has uncommitted edits when the version is set | the script refuses and changes nothing |

### Verification notes

- Method: test/build/test_release.py runs the script in an isolated repository; test/build/test_plugin_manifests.py compares the manifests of the repository with `package.json`; both run in `just release-tests` and `just check`.
- Criteria: All four files change in one commit; any drift or dirty manifest fails.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-001](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-001.md): A reader reads a faithful rendering of any document
<!-- okf:links:end -->
