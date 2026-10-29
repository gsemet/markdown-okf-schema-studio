---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-076
uuid: 30314c60-b057-41f4-b74f-60d266d261bd
title: CI tags a version change only after a green heavy run of the commit
description: When a push to main changes the package version, the CI workflow
  SHALL run the heavy jobs in that push run and SHALL tag the commit only when
  they both succeed; a push without a version change SHALL still run the tag
  step with the heavy jobs skipped.
project: MDOKFSTUDIO
scope: rendering-core
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: true
exemption_reason: Declarative CI workflow configuration and build scripts
  (scripts/version.py, scripts/select_e2e_run.py), outside the scanned source
  directories; verified by test_workflows.py, test_release.py and
  test_select_e2e_run.py.
derived_by: []
implemented_in_files: []
tested_in_files:
- test/build/test_release.py
- test/build/test_select_e2e_run.py
- test/build/test_workflows.py
default_owner_email: gaetan@xeberon.net
---

## CI tags a version change only after a green heavy run of the commit

### Normative behavior

When a push to main changes the package version, the CI workflow SHALL run the heavy jobs (`integration` and `stress`) in that push run and SHALL tag the commit only when they both succeed; a push without a version change SHALL still run the tag step with the heavy jobs skipped. When `checks` or a heavy job of a version change does not succeed, the workflow SHALL say why in the job summary. The Pages site of a tag SHALL reuse the end-to-end reports of that green heavy run.

### Scenario (nominal): Version change on main with a green heavy run

- GIVEN a push to main whose `package.json` version differs from the version before the push (`release-check` outputs `bump=true`, the same test `scripts/version.py --tag-before` applies)
- WHEN the `integration` and `stress` jobs of that push run succeed and `checks` succeeds
- THEN `tag-release` tags the commit, `release` and `pages` run, and `pages` builds the site from the `studio-reports` artifact of the same run instead of running the suite

### Scenario (nominal): Push to main without a version change

- GIVEN a push to main whose `static`, `visual` and `report` jobs succeed and whose version is unchanged (`bump=false`)
- WHEN the workflow reaches `tag-release`
- THEN `integration` and `stress` are skipped, `tag-release` runs and outputs no tag, and `release` and `pages` are skipped

### Scenario (boundary): Failure, cancellation and other events

| Input | Outcome |
| --- | --- |
| version change, `checks`, `integration` or `stress` not `success` (failure, skipped, cancelled; an `integration` failure also fails `report`, then `checks`) | `tag-release` runs, creates no tag, writes "Release not tagged" with the `checks`, `integration` and `stress` results and the re-run command to the job summary, and fails; `release` and `pages` are skipped |
| version change | `stress` blocks (`continue-on-error` is off), so its failure reaches `tag-release`; otherwise it stays advisory |
| no version change, `checks` did not succeed | `tag-release`, `release` and `pages` are skipped |
| `release-check` failed or was cancelled (for example `github.event.before` is not reachable) | the heavy jobs, `tag-release`, `release` and `pages` are skipped and no summary is written; the run is red |
| the run is cancelled | `tag-release`, `release` and `pages` are skipped, no summary is written |
| `tag-release` output an empty tag | `release` and `pages` are skipped |
| the event is not a push to `refs/heads/main` | `release-check` and `tag-release` are skipped; the heavy jobs run only on a dispatch with `heavy` |

### Scenario (boundary): Reports of a later Pages deploy

| Run of the tagged commit | Selected by `scripts/select_e2e_run.py` |
| --- | --- |
| `workflow_dispatch` run, green, `integration` succeeded, report artifacts present | yes (unchanged) |
| `push` run on `main`, green, `integration` and `stress` succeeded, report artifacts present | yes |
| `push` run whose `integration` or `stress` is skipped, failed or absent | no |
| `push` run on another branch, of another commit, not completed or not green | no |

### Verification notes

- Method: test/build/test_workflows.py parses `.github/workflows/ci.yml` and `pages.yml`, evaluates the `if` expressions of the heavy jobs, `tag-release` and its steps for each event and job result, runs the refusal step's script, and checks that every `needs.<job>` reference names a job the job needs. test/build/test_release.py runs `scripts/version.py --bump-since`. test/build/test_select_e2e_run.py checks the run selection.
- Criteria: every job below a skippable job uses `!cancelled()` with an explicit `needs.<job>.result` check; a version change is tagged only when `checks` and both heavy results are `success`, and every other result of those three on a version change runs the refusal step (truth table over all results).
