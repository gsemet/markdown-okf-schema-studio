---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-076
uuid: 30314c60-b057-41f4-b74f-60d266d261bd
title: CI tags a version change only after a green heavy run of the commit
description: Every push to main SHALL run the heavy jobs; when the push changes
  the package version, the CI workflow SHALL tag the commit only when they all
  succeed, and a push without a version change SHALL still run the tag step and
  create no tag.
project: MDOKFSTUDIO
scope: rendering-core
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-007
scenarios:
- id: S1
  title: Version change on main with a green heavy run
- id: S2
  title: Re-run of the failed jobs of a version change
- id: S3
  title: Artifact names and attempts
- id: S4
  title: Push to main without a version change
- id: S5
  title: Failure, cancellation and other events
- id: S6
  title: Reports of a later Pages deploy
- id: S7
  title: Acceptance stage, one shard per e2e group
- id: S8
  title: Artifacts of the acceptance shards
- id: S9
  title: Acceptance reports of a campaign
- id: S10
  title: Tagging needs the acceptance job
- id: S11
  title: Acceptance shards of a later Pages deploy
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- scripts/e2e-campaign.mjs
- scripts/select-acceptance-attempts.mjs
- scripts/select_e2e_run.py
- scripts/unpack_vsix.py
- scripts/version.py
tested_in_files:
- test/build/runnerArgs.test.ts
- test/build/selectAcceptanceAttempts.test.ts
- test/build/test_release.py
- test/build/test_select_e2e_run.py
- test/build/test_unpack_vsix.py
- test/build/test_workflows.py
- test/site/e2eCampaign.test.ts
default_owner_email: gaetan@xeberon.net
---

## CI tags a version change only after a green heavy run of the commit

### Normative behavior

Every push to main SHALL run the heavy jobs (`integration`, `acceptance` and `stress`); when the push changes the package version, the CI workflow SHALL tag the commit only when they all succeed; a push without a version change SHALL still run the tag step and create no tag. When `checks` or a heavy job of a version change does not succeed, the workflow SHALL say why in the job summary. The `acceptance` job SHALL run the acceptance files in one shard per e2e group that has one, and the report SHALL keep the newest attempt of each group and SHALL fail when such a group has no passed report of the same campaign. The Pages site of a tag SHALL reuse the end-to-end reports of that green heavy run. After "Re-run failed jobs" on that run, every job and the Pages site SHALL use the artifacts of the newest attempt of each producing job, never an older attempt's artifact of the same name. A heavy dispatch SHALL build the gallery and the site unless `gallery` is false, and only when `integration` and `report` succeed.

### Scenario S1 (nominal): Version change on main with a green heavy run

- GIVEN a push to main whose `package.json` version differs from the version before the push (`release-check` outputs `bump=true`, the same test `scripts/version.py --tag-before` applies)
- WHEN the `integration` job, every `acceptance` shard and the `stress` job of that push run succeed and `checks` succeeds
- THEN `tag-release` tags the commit, `release` dispatches the **Release VSIX** workflow with the tag on the default branch, and `pages` builds the site from the merged reports artifact of the same run (`studio-reports-attempt-<n>`, the name the `report` job outputs) instead of running the suite

### Scenario S2 (nominal): Re-run of the failed jobs of a version change

- GIVEN a version-change push run whose `integration` job failed on attempt 1 ("Release not tagged") and whose `visual` job and `acceptance` shards passed
- WHEN the failed jobs are re-run (`gh run rerun {run-id} --failed`) and pass on attempt 2, hours after attempt 1
- THEN `report` merges `e2e-visual-attempt-1` (the `visual` output kept from attempt 1) and the acceptance shard artifacts of attempt 1 with `e2e-integration-attempt-2`, the stages are accepted as one campaign because all carry the run id pinned by the workflow, `tag-release` tags the commit, and `pages` builds the site from `studio-reports-attempt-2`

### Scenario S3 (boundary): Artifact names and attempts

| Input | Outcome |
| --- | --- |
| an artifact uploaded by a job of `ci.yml` | its name ends with `-attempt-<n>` (`github.run_attempt`); `visual`, `integration` and `report` output that name as `artifact` (`acceptance` outputs a pattern, S8) |
| a job or Pages consumes an artifact of the same run | it downloads the producing job's `artifact` output (Pages: the `reports_artifact` input), never a fixed name |
| only `stress` was re-run | `report` is not re-run; Pages uses `studio-reports-attempt-1` |
| `integration` is skipped | `report` downloads no integration artifact and reports the real VS Code stage as skipped |
| the calling run passes `reports_from_caller` without a `reports_artifact` | Pages warns and runs the suite (an empty name would download every artifact) |
| a failed visual manifest lists `{page, detail}` failures | `report` prints each as `{page}: {detail}`, joined with `; `, never `[object Object]`; string failures print as they are; `error` of the manifest keeps its priority |
| the visual and integration stages started two hours apart or more | `report` fails, unless both campaigns carry the same run id pinned by `STUDIO_E2E_RUN_ID` (`pinnedRunId`) |

### Scenario S4 (nominal): Push to main without a version change

- GIVEN a push to main whose `static`, `visual` and `report` jobs succeed and whose version is unchanged (`bump=false`)
- WHEN the workflow reaches `tag-release`
- THEN `integration`, `acceptance` and `stress` run, with `stress` advisory, `tag-release` runs and outputs no tag, and `release` and `pages` are skipped

### Scenario S5 (boundary): Failure, cancellation and other events

| Input | Outcome |
| --- | --- |
| version change, `checks`, `integration`, `acceptance` or `stress` not `success` (failure, skipped, cancelled; an `integration` or `acceptance` failure also fails `report`, then `checks`) | `tag-release` runs, creates no tag, writes "Release not tagged" with the `checks`, `integration`, `acceptance` and `stress` results and the re-run command to the job summary, and fails; `release` and `pages` are skipped |
| version change | `stress` blocks (`continue-on-error` is off), so its failure reaches `tag-release`; otherwise it stays advisory |
| no version change, `checks` did not succeed | `tag-release`, `release` and `pages` are skipped |
| `release-check` failed or was cancelled (for example `github.event.before` is not reachable) | the heavy jobs, `tag-release`, `release` and `pages` are skipped and no summary is written; the run is red |
| the run is cancelled | `tag-release`, `release` and `pages` are skipped, no summary is written |
| `tag-release` output an empty tag | `release` and `pages` are skipped |
| the event is not a push to `refs/heads/main` | `release-check` and `tag-release` are skipped; the heavy jobs run only on a dispatch with `heavy` |
| a dispatch with `heavy` (and `gallery` not false) whose `integration` and `report` succeed | `gallery` runs and uploads the gallery and site as `studio-site-attempt-<n>` |
| a dispatch with `heavy` whose `integration` or `report` did not succeed, or with `gallery` false | `gallery` is skipped |

### Scenario S6 (boundary): Reports of a later Pages deploy

| Run of the tagged commit | Selected by `scripts/select_e2e_run.py` |
| --- | --- |
| `workflow_dispatch` run, green, `integration`, `stress` and every acceptance shard (S11) succeeded, report artifacts present | yes |
| `push` run on `main`, green, `integration`, `stress` and every acceptance shard (S11) succeeded, report artifacts present | yes |
| a run of either event whose `integration` or `stress` is skipped, failed or absent | no |
| `push` run on another branch, of another commit, not completed or not green | no |
| run re-run after a failure, several attempts of the reports | yes; the newest attempt of `studio-reports` is downloaded (attempts compared as numbers) |
| newest `studio-reports` attempt expired, or older than the newest attempt of a stage artifact | no (an older attempt is never used instead) |
| artifacts without the `-attempt-<n>` suffix (runs made before it) | no; the suite runs |

### Scenario S7 (boundary): Acceptance stage, one shard per e2e group

| Input | Outcome |
| --- | --- |
| the `acceptance` job of a heavy run (push to `main`, or a dispatch with `heavy`) | one shard per e2e group that has a file under `test/integration/acceptance/`, listed in the group order of `test/shared/e2eGroups.ts`, with fail-fast off; each shard runs `just ci-acceptance <group>` under the virtual screen with the strict viewport guard and uploads its reports even when it fails |
| `--group` names no e2e group, has no value, is given twice, is written `--group=<id>`, or comes without `--acceptance-only` | the launcher refuses before any VS Code starts and says what to write |
| an acceptance file is not named after an e2e group, or does not declare its window kind once, or the asked group has no file | the run fails before any window opens |
| the screen is locked | `ci-acceptance` stops with exit code 3 and runs nothing |
| the built VSIX to unpack has a member that would leave the destination folder or no `extension/package.json`, or the destination holds something | the unpacking fails and names the reason; nothing is written for an unsafe member |

### Scenario S8 (boundary): Artifacts of the acceptance shards

| Input | Outcome |
| --- | --- |
| each shard uploads `e2e-acceptance-<group>-attempt-<n>` | the `acceptance` job outputs the pattern `e2e-acceptance-*-attempt-*`, which covers every shard's artifact |
| `report` downloads them | with that pattern into `out/ci-artifacts/acceptance/`, not merged: each artifact keeps its own folder |
| `acceptance` is skipped | `report` downloads no acceptance artifact |

### Scenario S9 (boundary): Acceptance reports of a campaign

| Input | Outcome |
| --- | --- |
| several downloaded attempts of a group | the newest attempt (compared as numbers) replaces `out/reports/acceptance/<group>/` |
| a single downloaded artifact, extracted straight into the download folder | its groups are kept |
| the newest attempt holds no report of the group | the group is missing; an older attempt is never used |
| a group with an acceptance file has no manifest, a manifest that is not `passed`, or one of another campaign (started two hours or more from the visual stage, unless the three carry the same pinned run id) | the report fails and names the group and the reason |
| the checkout has no acceptance file | the report fails |
| the acceptance stage starts again | the group manifests and the merged acceptance manifest are deleted first |

### Scenario S10 (nominal): Tagging needs the acceptance job

- GIVEN a version-change push run whose `integration` and `stress` jobs succeed
- WHEN one `acceptance` shard fails
- THEN `report` and `checks` fail, `tag-release` creates no tag and names the `acceptance` result in "Release not tagged", and `release` is skipped; only when `checks` and the three heavy jobs succeed does `tag-release` tag, and `pages` take the reports of the calling run

### Scenario S11 (boundary): Acceptance shards of a later Pages deploy

| Run of the tagged commit | Selected by `scripts/select_e2e_run.py` |
| --- | --- |
| every job named `acceptance (<group>)` succeeded, at least one, and each has a live `e2e-acceptance-<group>` artifact | yes (with S6) |
| no `acceptance (<group>)` job (a run made before the job, or a skipped matrix), or one not succeeded | no |
| a succeeded `acceptance (<group>)` job with no `e2e-acceptance-<group>` artifact (another group's artifact does not stand for it), the newest attempt of one group expired, or `studio-reports` older than it | no |

### Verification notes

- Method: test/build/test_workflows.py parses `.github/workflows/ci.yml` and `pages.yml`, evaluates the `if` expressions of the heavy jobs, `tag-release` and its steps for each event and job result, runs the refusal step's script, and checks that every `needs.<job>` reference names a job the job needs. test/build/test_release.py runs `scripts/version.py --bump-since`. test/build/test_select_e2e_run.py checks the run selection, including runs with several attempts and acceptance shards. test/build/test_workflows.py also checks that every artifact name of `ci.yml` carries the attempt and that every download names the `artifact` output of a job it needs, that the acceptance matrix lists the groups with an acceptance file, and runs the `ci-acceptance` target and the Pages find step. test/build/runnerArgs.test.ts checks the launcher arguments and the file selection, test/build/test_unpack_vsix.py the unpacking, test/build/selectAcceptanceAttempts.test.ts the attempt kept per group, and test/site/e2eCampaign.test.ts the campaign gap rule and the acceptance stage of the report.
- Criteria: every job below a skippable job uses `!cancelled()` with an explicit `needs.<job>.result` check; a version change is tagged only when `checks` and every heavy result are `success`, and every other result of those four on a version change runs the refusal step (truth table over all results).

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-007](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-007.md): A maintainer ships a version only after green checks and reviewed release notes
<!-- okf:links:end -->
