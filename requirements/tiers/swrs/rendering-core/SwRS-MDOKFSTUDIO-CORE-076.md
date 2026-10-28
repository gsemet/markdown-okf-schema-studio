---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-076
uuid: 30314c60-b057-41f4-b74f-60d266d261bd
title: CI tags a release after skipped heavy jobs
description: When a push to main passes the required checks while the manual
  heavy jobs are skipped, the CI workflow SHALL still run the tag step, and the
  release and Pages jobs when a tag was created.
project: MDOKFSTUDIO
scope: rendering-core
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: true
exemption_reason: Declarative CI workflow configuration, outside the scanned
  source directories; verified by test_workflows.py.
derived_by: []
implemented_in_files: []
tested_in_files:
- test/build/test_workflows.py
default_owner_email: gaetan@xeberon.net
---

## CI tags a release after skipped heavy jobs

### Normative behavior

When a push to main passes the required checks while the manual heavy jobs are skipped, the CI workflow SHALL still run the tag step, and the release and Pages jobs when a tag was created.

### Scenario (nominal): Heavy jobs skipped on a push to main

- GIVEN a push to main whose `static`, `visual` and `report` jobs succeed and whose `integration` and `stress` jobs are skipped
- WHEN the workflow reaches `tag-release`
- THEN `tag-release` runs, and `release` and `pages` run when it output a non-empty tag

### Scenario (boundary): Failure, cancellation and other events

| Input | Outcome |
| --- | --- |
| `checks` did not succeed | `tag-release`, `release` and `pages` are skipped |
| the run is cancelled | `tag-release`, `release` and `pages` are skipped |
| `tag-release` output an empty tag | `release` and `pages` are skipped |
| the event is not a push to `refs/heads/main` | `tag-release` is skipped |

### Verification notes

- Method: test/build/test_workflows.py parses `.github/workflows/ci.yml` and checks the `if` of every job below a skippable job and of `tag-release`, `release` and `pages`.
- Criteria: every such job uses `!cancelled()` with an explicit `needs.<job>.result` check.
