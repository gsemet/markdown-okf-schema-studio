# CI guidelines

The CI only runs what a developer can run locally. All logic lives in the task runner
(`justfile`); the CI workflow only provides machines and calls targets.

## Rules

1. **One job = at most two targets.** `just dev-ci` (setup), then one `just ci-<name>` that runs
   its steps in sequence. No inline scripts in the workflow beyond these calls.
2. **Every `ci-<name>` target runs locally** with the same result, on a machine set up by
   `just dev` (or `just dev-ci`). If a CI failure cannot be reproduced with
   `just ci-<name>`, the target is incomplete.
3. **The workflow keeps only what the platform must do**: checkout (with LFS), toolchain setup
   actions (language runtimes, task runner), caches, artifact upload/download, a display server
   for GUI tests, secrets, permissions. Nothing else.
4. **Setup is a target too.** `just dev-ci` installs exactly what CI jobs need, non-interactively,
   from the lock files. `just dev` stays the developer entry point and may do more. A job sets up
   only what its target uses (`just dev-ci visual` adds Chromium, plantuml and graphviz). System
   packages come from a cache of their archives, never from a live mirror on every run: a mirror
   that serves one runner at 50 kB/s must not decide whether a job passes.
5. **Parallel jobs are independent.** Each job builds what it needs. Jobs share results only
   through artifacts, and a final job (`ci-report`) merges them.
6. **Keep one stable aggregate job name** (for example `checks`) that depends on all others, so
   branch protection does not change when jobs are split or renamed.
7. **The local full gate stays one command** (`just preflight`) running the same `ci-*`
   targets in sequence. CI parallelises them, it never adds steps that preflight lacks.
8. **Failures must be readable from the target output**: each `ci-*` target ends with a clear
   pass/fail line and writes its reports under a documented folder of `out/reports/` that the
   workflow uploads.
9. **No retries to hide flakiness.** A job that passes on re-run without a change is a bug to fix,
   not a CI setting.
10. **Every PR uses the template** `.github/PULL_REQUEST_TEMPLATE.md` (Summary, Deliverables,
    Changes, Impacts, Blast radius graded 1 to 3, Test plan), written in English. Fill every
    section; write "None" rather than delete one. It is written for a reader outside the team: no
    internal ids in the text (see "PR body for an external reader" in
    change-requests-lifecycle.guidelines.md).
11. **Every job has a `timeout-minutes`** (about twice its healthy duration: 30 for the VS Code
    integration and stress jobs, 15 for the others, 10 for the report job). A hung job must fail fast and name
    where it stopped, never run to the platform default of six hours. Never raise a timeout to
    make a slow or flaky run pass: find what waits.
    - **A hang names its step and leaves a dump.** The step that runs the tests has its own
      `timeout-minutes` below the job's (20 for `integration`), so a hang cancels that step and the
      `if: always()` steps still collect diagnostics (`just ci-hang-dump`) and upload the reports.
      This is the one job with a third target, and it only collects files.
    - **Real-window tests run under the hang watchdog** (`test/shared/hangWatchdog.ts`, one module
      for every threshold): each trusted-window step has a budget and logs `STEP start` / `STEP
      done`; a single VS Code call that must return is wrapped in `bounded()` so a timeout names the
      call; the extension host writes a heartbeat file every 5 s and the launcher kills a launch
      whose heartbeat is silent for 90 s or that passes its deadline (`STUDIO_LAUNCH_TIMEOUT_MS`,
      15 min). Every timeout writes `out/reports/e2e/hang-dumps/<time>-<step>/` (processes, VS Code
      log tails, window state and tabs, heartbeat, screenshots). A new step gets a budget about
      twice its healthy duration; never raise one to make a run pass.
12. **A flake is a bug, fixed at its cause and proved by repetition.** A test that fails without a
    change is not retried, and its timeout is not raised: it is a race in the product or the test.
    - **Root cause with evidence.** Collect every failing run (`gh run view <id> --log-failed`),
      write down what the logs prove and what they do not, and trace each code path that can
      produce the observed state. A theory the next failure contradicts is dropped, not patched.
    - **Fix with a deterministic readiness signal.** The test waits for a state the product
      reports (the page echoed the render's request id, no deferred update is armed, the control
      has the caret), never for time: no sleep, no "poll until it works", no retry loop around an
      action. When the product itself misbehaves (an editor closes when it should not), fix the
      product.
    - **Failure messages carry diagnostics.** A wait or an assertion that can fail on a race says
      what the host and the page held when it failed (state, focus, the page's event trace), so
      the next failure explains itself.
    - **Prove it with the stress mode.** Add the scenario to the stress list
      (`test/shared/stressPlan.ts`) and let the `stress` job (`just ci-stress`, N rounds per window)
      pass. It is the one CI-only job: it repeats scenarios that preflight runs once, so it adds
      repetitions, not steps (rule 7). It is advisory: it is not part of the required `checks` job,
      so a red stress run does not block a merge, but it is a flake to fix with the steps above,
      never to ignore.
13. **Real VS Code jobs are manual, except on a version-change push (rule 14).**
    The required path (`checks`) runs the simulated tests only:
    static checks and the Playwright/Chromium visual tests against a mock host, then `ci-report`
    with the real VS Code stage reported as skipped (`just ci-report visual`). The real VS Code
    window jobs, `integration` and `stress`, run on demand:
    `gh workflow run ci.yml --ref <branch> -f heavy=true` (add `-f gallery=true` for the gallery
    and site). To loop one flaky scenario many times, use
    `-f heavy=true -f stress_repeat=60 -f stress_scenarios=alert-dropdown` (narrow the scenarios
    above about 20 rounds; the timeouts stay as they are). Run them before merging a change to the extension host, the webview or the
    real-window tests, and run `npm run test:integration` locally (one VS Code window at a time).
    A third on-demand job, `toc-loop`, is a repro tool for the `toc` edit-toggle flake:
    `gh workflow run ci.yml --ref <branch> -f toc_loop=30 [-f toc_delay_ms=300]` (1 to 40 rounds,
    delay 0 to 2000 ms, launch deadline 30 minutes inside a 35-minute step). It does not gate merges
    and is not part of `checks`; failed rounds are counted and the job is red if any failed.
14. **A release is tagged only after a green heavy run of its commit.** A push to `main` that
    changes the package version runs the heavy jobs without a dispatch: the `release-check` job
    detects the change (`scripts/version.py --bump-since`, the same test `tag-release` uses) and
    `integration` and `stress` run in that push run, where `stress` blocks instead of being
    advisory. `tag-release` needs `checks` and both heavy jobs, and tags only when all three
    results are `success`. Otherwise it creates no tag, writes "Release not tagged" with the result
    of `checks`, `integration` and `stress` to the job summary and fails (an integration failure
    fails `report`, then `checks`; the summary is written all the same). If `release-check` itself
    fails or the run is cancelled, nothing is tagged and no summary is written; the run is red or
    cancelled. The Pages deploy of the tag reuses the reports of that run instead of running the
    suite again. A red heavy job on that push is recovered in the same run (next section).

## Recovering from a red heavy job on a release push

Only the push that changes the version can tag it: a later push without a version change does
not. When a flake fails `integration` or `stress` on that push, re-run the failed jobs of the
same run; no new commit and no manual tag are needed.

1. Open the run: Actions, workflow **CI**, the run of the version commit on `main` (its
   `tag-release` summary says "Release not tagged").
2. Re-run jobs > **Re-run failed jobs**, then **Re-run jobs**. With the CLI:
   `gh run rerun <run-id> --failed` (the run id is in the summary and in the run URL).
3. What to expect: GitHub re-runs the failed jobs and the jobs that depend on them, including the
   ones that were skipped: the heavy job, then `report` and `checks` (after an integration
   failure), `tag-release`, `release` and `pages`. The jobs that passed are not re-run and keep
   their results and outputs (`release-check` keeps `bump=true`). The re-run uses the same commit
   and the same push event, so `tag-release` tags that commit when everything is green.
4. Artifacts per attempt: every artifact name of `ci.yml` ends with `-attempt-<n>`
   (`github.run_attempt`), and a job whose artifact is consumed later reports that name in its
   `artifact` output (`visual`, `integration`, `report`). Consumers download that output, never a
   fixed name: after "Re-run failed jobs", a download by a fixed name returned the attempt-1
   artifact. A job that is not re-run keeps its outputs, so `report` merges the attempt-1 visual
   stage with the re-run integration stage, and Pages (`reports_artifact`, or
   `scripts/select_e2e_run.py`, which picks the newest attempt of `studio-reports`) uses the newest
   merged reports. Both stages carry the run id pinned by the workflow (`STUDIO_E2E_RUN_ID`), so
   `report` accepts them however far apart they started; the two-hour limit applies only to local
   campaigns. Keep each upload and its download consistent (test/build/test_workflows.py).
5. Once the tag exists, re-run only the failed jobs (`release`, `pages`). Never re-run all jobs
   then: `tag-release` would find the tag, output none, and skip `release` and `pages`.

Fix and release a new version instead when the failure is a real bug, or when the same job fails
again after a re-run: open a fix, merge it, then bump the version (`just version`) and push.
