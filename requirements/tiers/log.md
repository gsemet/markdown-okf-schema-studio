# Update Log

## 2026-10-24

- Created the okfreq requirements bundle for the Markdown OKF-Schema Studio: two tiers (StRS,
  SwRS) with the prefixes `StRS-MDOKFSTUDIO` and `SwRS-MDOKFSTUDIO`, 16 scopes mapped to the e2e
  groups of `test/shared/e2eGroups.ts`, the strict StRS coverage mode
  `linked-swrs-and-validation-test`, a local guideline that specializes the okfreq baseline, and
  the checks `just requirements-lint` (part of `just check`) and `just requirements-report`
  (part of `just preflight`). okfreq is a project dependency (`okf-schema` 0.13.0, dependency
  group `requirements`) and runs through `uv run`. No requirement exists yet.
  Verification: `okfreq validate`, `okfreq lint --check` and `okfreq update-coverage --check` pass
  on the empty bundle (see the pull request for the run).
