# Update Log

## 2026-10-24 (batch 1)

- Added the first requirements: 27 StRS and 237 SwRS for rendering-core (5 / 68), code-blocks
  (4 / 38), gfm (4 / 38) and myst (14 / 93). Each SwRS derives from a StRS and has a nominal
  and a boundary scenario. No traceability markers yet. Verification: `okfreq validate
  --prose --check-links`, `lint --check` and `update-coverage --check` pass (264 requirements).

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
