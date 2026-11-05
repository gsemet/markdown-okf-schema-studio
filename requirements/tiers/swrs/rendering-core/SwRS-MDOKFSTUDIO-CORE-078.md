---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-078
uuid: 07804141-c861-47d8-943f-d66482117cb9
title: A version ships only with its reviewed release notes
description: The repository check SHALL fail when the package version has no
  valid notes file under docs/releases-notes/, and the release job SHALL publish
  that file as the GitHub release notes with its images attached to the release.
project: MDOKFSTUDIO
scope: rendering-core
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: true
exemption_reason: Implemented in scripts/release_notes.py and the declarative
  release workflow, outside the scanned source directories; verified by
  test_release.py and test_workflows.py.
derived_by: []
implemented_in_files: []
tested_in_files:
- test/build/test_release.py
- test/build/test_workflows.py
default_owner_email: gaetan@xeberon.net
---

## A version ships only with its reviewed release notes

### Normative behavior

The repository check SHALL fail when the package version has no valid notes file under docs/releases-notes/, and the release job SHALL publish that file as the GitHub release notes with its images attached to the release.

### Scenario (nominal): A version pull request carries its notes

- GIVEN a `package.json` version X.Y.Z and one folder `docs/releases-notes/YYYY-MM-DD-vX.Y.Z/` with `release-notes.md`, whose first line is a title naming X.Y and whose images are files of that folder
- WHEN `just check` runs (`scripts/release_notes.py --check`), locally or in the `static` job of the pull request
- THEN the check passes

### Scenario (nominal): The release publishes the reviewed notes

- GIVEN a tag vX.Y.Z whose commit holds its notes folder
- WHEN the **Release VSIX** workflow runs
- THEN the notes are prepared before the Marketplace publication, the GitHub release body is the file with each image pointing to `releases/download/vX.Y.Z/<file>`, and the images are attached to the release next to the VSIX

### Scenario (boundary): Notes that block the check or the release

| Input | Outcome |
| --- | --- |
| no folder for the version, or two folders for the version | the check fails and names the expected path |
| empty notes, or a first line that is no title or names another version | the check fails |
| an image that is missing, in a subfolder or at an absolute URL | the check fails |
| `--prepare` with a tag that is not a stable `vX.Y.Z`, or without notes | the release stops before the Marketplace publication and writes no notes |
| a manual dispatch with `notes: placeholder` | the release publishes the placeholder, to replace by hand |

### Verification notes

- Method: test/build/test_release.py runs `scripts/release_notes.py` in isolated folders; test/build/test_workflows.py parses `.github/workflows/release.yml` and the `check` recipe of the justfile. Both run in `just release-tests`.
- Criteria: every refusal above exits with a failure, no notes are written for a refused tag, and the notes step comes before the Marketplace step.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-001](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-001.md): A reader reads a faithful rendering of any document
<!-- okf:links:end -->
