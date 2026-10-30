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
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: true
exemption_reason: Declarative CI workflow configuration and build scripts
  (scripts/version.py, scripts/select_e2e_run.py, scripts/e2e-campaign.mjs),
  outside the scanned source directories; verified by test_workflows.py,
  test_release.py, test_select_e2e_run.py and e2eCampaign.test.ts.
derived_by: []
implemented_in_files: []
tested_in_files:
- test/build/test_release.py
- test/build/test_select_e2e_run.py
- test/build/test_workflows.py
- test/site/e2eCampaign.test.ts
default_owner_email: gaetan@xeberon.net
---

## CI tags a version change only after a green heavy run of the commit

### Normative behavior

When a push to main changes the package version, the CI workflow SHALL run the heavy jobs (`integration` and `stress`) in that push run and SHALL tag the commit only when they both succeed; a push without a version change SHALL still run the tag step with the heavy jobs skipped. When `checks` or a heavy job of a version change does not succeed, the workflow SHALL say why in the job summary. The Pages site of a tag SHALL reuse the end-to-end reports of that green heavy run. After "Re-run failed jobs" on that run, every job and the Pages site SHALL use the artifacts of the newest attempt of each producing job, never an older attempt's artifact of the same name.

### Scenario (nominal): Version change on main with a green heavy run

- GIVEN a push to main whose `package.json` version differs from the version before the push (`release-check` outputs `bump=true`, the same test `scripts/version.py --tag-before` applies)
- WHEN the `integration` and `stress` jobs of that push run succeed and `checks` succeeds
- THEN `tag-release` tags the commit, `release` and `pages` run, and `pages` builds the site from the merged reports artifact of the same run (`studio-reports-attempt-<n>`, the name the `report` job outputs) instead of running the suite

### Scenario (nominal): Re-run of the failed jobs of a version change

- GIVEN a version-change push run whose `integration` job failed on attempt 1 ("Release not tagged") and whose `visual` job passed
- WHEN the failed jobs are re-run (`gh run rerun <run-id> --failed`) and pass on attempt 2, hours after attempt 1
- THEN `report` merges `e2e-visual-attempt-1` (the `visual` output kept from attempt 1) with `e2e-integration-attempt-2`, its stages are accepted as one campaign because both carry the run id pinned by the workflow, `tag-release` tags the commit, and `pages` builds the site from `studio-reports-attempt-2`

### Scenario (boundary): Artifact names and attempts

| Input | Outcome |
| --- | --- |
| an artifact uploaded by a job of `ci.yml` | its name ends with `-attempt-<n>` (`github.run_attempt`); `visual`, `integration` and `report` output that name as `artifact` |
| a job or Pages consumes an artifact of the same run | it downloads the producing job's `artifact` output (Pages: the `reports_artifact` input), never a fixed name |
| only `stress` was re-run | `report` is not re-run; Pages uses `studio-reports-attempt-1` |
| `integration` is skipped | `report` downloads no integration artifact and reports the real VS Code stage as skipped |
| the calling run passes `reports_from_caller` without a `reports_artifact` | Pages warns and runs the suite (an empty name would download every artifact) |
| the visual and integration stages started two hours apart or more | `report` fails, unless both campaigns carry the same run id pinned by `STUDIO_E2E_RUN_ID` (`pinnedRunId`) |

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
| run re-run after a failure, several attempts of the reports | yes; the newest attempt of `studio-reports` is downloaded (attempts compared as numbers) |
| newest `studio-reports` attempt expired, or older than the newest attempt of a stage artifact | no (an older attempt is never used instead) |
| artifacts without the `-attempt-<n>` suffix (runs made before it) | no; the suite runs |

### Verification notes

- Method: test/build/test_workflows.py parses `.github/workflows/ci.yml` and `pages.yml`, evaluates the `if` expressions of the heavy jobs, `tag-release` and its steps for each event and job result, runs the refusal step's script, and checks that every `needs.<job>` reference names a job the job needs. test/build/test_release.py runs `scripts/version.py --bump-since`. test/build/test_select_e2e_run.py checks the run selection, including runs with several attempts. test/build/test_workflows.py also checks that every artifact name of `ci.yml` carries the attempt and that every download names the `artifact` output of a job it needs, and runs the Pages find step. test/site/e2eCampaign.test.ts checks the campaign gap rule.
- Criteria: every job below a skippable job uses `!cancelled()` with an explicit `needs.<job>.result` check; a version change is tagged only when `checks` and both heavy results are `success`, and every other result of those three on a version change runs the refusal step (truth table over all results).

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-001](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-001.md): A reader reads a faithful rendering of any document
<!-- okf:links:end -->
