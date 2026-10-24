# Requirements

This bundle is the product contract of the Markdown OKF-Schema Studio VS Code extension, managed
with `okfreq`. It has two tiers.

| Tier | Description | Usage |
| --- | --- | --- |
| [StRS](tiers/strs/index.md) | Stakeholder Requirements Specifications | A use case a user can run and see in VS Code |
| [SwRS](tiers/swrs/index.md) | Software Requirements Specifications | One directly testable behaviour of the extension |

The bundle is empty for now: the requirements are written scope by scope, and each one is traced to
the code that implements it and the tests that verify it. `just requirements-lint` checks the
bundle, and `just requirements-report` writes the traceability report.
