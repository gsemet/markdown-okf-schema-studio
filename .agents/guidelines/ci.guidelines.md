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
   from the lock files. `just dev` stays the developer entry point and may do more.
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
10. **Every PR uses the template** `.github/PULL_REQUEST_TEMPLATE.md` (Summary, Changes, Impacts,
    Blast radius graded 1 to 3, Test plan), written in English. Fill every section; write "None"
    rather than delete one.
