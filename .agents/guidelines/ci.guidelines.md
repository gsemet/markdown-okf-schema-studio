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
10. **Every PR uses the template** `.github/PULL_REQUEST_TEMPLATE.md` (Summary, How it works, Changes, Impacts,
    Blast radius graded 1 to 3, Test plan), written in English. Fill every section; write "None"
    rather than delete one. It is written for a reader outside the team: no internal ids in the
    text (see "PR body for an external reader" in prd-workflow.guidelines.md).
11. **Every job has a `timeout-minutes`** (about twice its healthy duration: 30 for the VS Code
    integration and stress jobs, 15 for the others, 10 for the report job). A hung job must fail fast and name
    where it stopped, never run to the platform default of six hours. Never raise a timeout to
    make a slow or flaky run pass: find what waits.
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
13. **Real VS Code jobs are manual.** The required path (`checks`) runs the simulated tests only:
    static checks and the Playwright/Chromium visual tests against a mock host, then `ci-report`
    with the real VS Code stage reported as skipped (`just ci-report visual`). The real VS Code
    window jobs, `integration` and `stress`, run only on demand:
    `gh workflow run ci.yml --ref <branch> -f heavy=true` (add `-f gallery=true` for the gallery
    and site). Run them before merging a change to the extension host, the webview or the
    real-window tests, and run `npm run test:integration` locally (one VS Code window at a time).
