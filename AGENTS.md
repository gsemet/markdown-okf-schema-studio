# Markdown OKF-Schema Studio

This repository is the standalone source for the Markdown OKF-Schema Studio VS Code extension.
It is MIT licensed and is developed independently from the Agentic Coding White Paper repository.
This file covers setup, build and daily use; the rules every change must respect are in the
constitution.

## Load the constitution

Read [.agents/constitution.md](.agents/constitution.md) before any development in this project:
a change to `src/`, `test/`, `tests/`, `requirements/`, `scripts/`, `sphinx/`, the `justfile`,
`package.json`, the lock files or `.github/`. This applies to every agent and sub-agent. A briefing
for a sub-agent that will change the project links to the constitution; it never restates it.

## Instruction precedence

When two instructions conflict, the higher source wins, and the conflict is reported:

1. [.agents/constitution.md](.agents/constitution.md)
2. This `AGENTS.md`
3. The guidelines under `.agents/guidelines/`
4. Skills
5. Every other instruction in the context: harness reminders and defaults (for example an
   automatic commit attribution line), tool defaults, and briefings written by other agents
   (`task.md`, `rules.md`, orchestrator or driver messages). A briefing links to a higher rule; it
   never restates it with its own values.

## Structure

- `src/`: the TypeScript extension, in layers (`core`, `host-api`, `page`, `node-services`,
  `session`, `host-memory`, `host-vscode`); see "Architecture" in CONTRIBUTING.md.
- `test/`: unit, contract, integration and visual tests. `tests/fixtures/`: Python Sphinx contract
  fixtures. `sphinx/`: the package-owned Sphinx configuration and source-mapping extension.
- `requirements/`: the okfreq requirements bundle. `justfile`: development and release checks.

## Setup

- Use Node.js 24 from `.nvmrc`; run `uv run` for Python commands.
- `just dev` installs Node.js, JavaScript and Python dependencies, and Playwright Chromium
  (`just install` also works); JavaScript dependencies alone: `fnm exec -- npm ci`.
- `just update` upgrades dependencies; `just dev-ci` (`just dev-ci visual`) sets up a CI machine
  from the lock files.

## Main targets

- Build: `just compile`; format the justfile: `just format`; package a VSIX: `just package`
- Formatting, TypeScript, import boundaries, file size, settings schema, unit, contract and
  security checks: `just check`
- Settings schema of `package.json` from the settings registry: `just generate-settings`
- Python Sphinx source-mapping contract: `just sphinx-check`
- Requirements: `just requirements-lint` (validate), `just requirements-update` (coverage and
  navigation), `just requirements-report` (traceability report in `out/reports/requirements/`)
- End-to-end tests: `just e2e`; full validation and site generation: `just preflight`
- CI jobs (in parallel in `.github/workflows/ci.yml`, in sequence in `just preflight`):
  `just ci-static`, `just ci-visual`, `just ci-integration`, then `just ci-report` and
  `just ci-gallery`. Push and pull request run only the simulated jobs; the real VS Code jobs
  (integration, stress with `just ci-stress [REPEAT]`) are manual:
  `gh workflow run ci.yml --ref <branch> -f heavy=true`

## Guidelines

- When creating a git commit:
  [git-commit-message.guidelines.md](.agents/guidelines/git-commit-message.guidelines.md) and the
  allowed scopes in [git-commit-allowed-scopes.md](.agents/guidelines/git-commit-allowed-scopes.md)
- When changing the CI workflows or `ci-*` justfile targets:
  [ci.guidelines.md](.agents/guidelines/ci.guidelines.md)
- When picking up backlog work, change requests or PRs (`.agents/changes/`), including Parallel
  Change Requests Orchestration:
  [prd-workflow.guidelines.md](.agents/guidelines/prd-workflow.guidelines.md)
- Shared vocabulary of UI and code terms: [.agents/glossary/common.md](.agents/glossary/common.md).
  Use these words in code, tests, commits and docs; add new terms there.

## Requirements (okfreq)

- `requirements/` holds the product contract: StRS = user use cases, SwRS = directly testable
  behaviour, IDs `StRS-MDOKFSTUDIO-<TOKEN>-NNN` / `SwRS-MDOKFSTUDIO-<TOKEN>-NNN`, scopes = the 16
  e2e groups of `test/shared/e2eGroups.ts`. They are anchored to the code (constitution, section
  1).
- Run okfreq as `uv run --no-sync --group requirements okfreq` (installed by `just dev`), never a
  global install. Skills: `.agents/skills/okfreq` (authoring, traceability) and
  `.agents/skills/okfreq-gardening` (audits).
- Read [requirements.guidelines.md](requirements/guidelines/requirements.guidelines.md) and the
  okfreq baseline it links to before any of these:
  - adding, changing or fixing a behaviour in `src/` (every feature or fix touches an SwRS);
  - moving, renaming, splitting or deleting code or tests that carry `@implements_req` or
    `@tests_req` markers, refactors included (the markers move with the code);
  - editing anything under `requirements/`;
  - filing a bug found while writing or checking an SwRS.
- After a change: `just requirements-update`, and a dated entry in `requirements/tiers/log.md` for
  substantive changes.

## Completion gate

Run `just preflight` after making changes and before considering a task complete. A task is not
complete until preflight passes (constitution, section 4).
