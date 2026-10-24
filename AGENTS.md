# Markdown OKF-Schema Studio

This repository is the standalone source for the Markdown OKF-Schema Studio VS Code extension.
It is MIT licensed and is developed independently from the Agentic Coding White Paper repository.

## Instruction precedence

When two instructions conflict, the higher source wins:

1. `CONSTITUTION.md`: none yet; the inviolable rules move there when this file grows too large
2. This `AGENTS.md`
3. The guidelines under `.agents/guidelines/`
4. Skills
5. Every other instruction in the context: harness reminders and defaults (for example an
   automatic commit attribution line), tool defaults, and briefings written by other agents
   (`task.md`, `rules.md`, orchestrator or driver messages)

Follow the higher source and report the conflict. A briefing never restates a rule from a higher
source with its own values: it links to that source.

## Structure

- `src/` contains the TypeScript extension implementation, in layers (`core`, `host-api`, `page`,
  `node-services`, `session`, `host-memory`, `host-vscode`); see "Architecture" in CONTRIBUTING.md.
- `test/` contains unit, contract, integration, and visual tests.
- `sphinx/` contains the minimal package-owned Sphinx configuration and source-mapping extension.
- `tests/fixtures/` contains the Python Sphinx contract fixtures.
- `justfile` contains the package-local development and release checks.

## Required workflow

- Use Node.js 24 from `.nvmrc`.
- Run `just dev` to install Node.js, JavaScript and Python dependencies, and Playwright Chromium.
- Install JavaScript dependencies with `fnm exec -- npm ci`.
- Use `uv run` for Python commands; dependencies use official PyPI and npm registries.

## Main targets

- Set up or restore the development environment: `just dev` (`just install` is also supported)
- Upgrade dependencies and refresh the development environment: `just update`
- Format the justfile: `just format`
- Build the extension: `just compile`
- Run formatting, TypeScript, import boundary, file size, unit, contract, and security checks:
  `just check`
- Run the Python Sphinx source-mapping contract: `just sphinx-check`
- Run end-to-end tests: `just e2e`
- Package a VSIX: `just package`
- Run the complete validation and site-generation pipeline: `just preflight`
- Set up a CI machine from the lock files: `just dev-ci` (`just dev-ci visual` for the visual job)
- CI jobs (run in parallel by `.github/workflows/ci.yml`, in sequence by `just preflight`):
  `just ci-static`, `just ci-visual`, `just ci-integration`, then `just ci-report` (merges the
  visual and integration outputs) and `just ci-gallery` (gallery and site from existing outputs).
  On push and pull request CI runs only the simulated jobs (static, visual, `just ci-report
  visual`); the real VS Code jobs (integration, stress) are manual:
  `gh workflow run ci.yml --ref <branch> -f heavy=true`
- CI only: `just ci-stress [REPEAT]` repeats the flake-prone and new real-window scenarios, in the
  trusted window then in the Restricted Mode window (manual job `stress`; see rules 12 and 13 of the
  CI guidelines)

## Guidelines

- When creating a git commit in this project: [.agents/guidelines/git-commit-message.guidelines.md](.agents/guidelines/git-commit-message.guidelines.md)
- Allowed Conventional commit scopes: [.agents/guidelines/git-commit-allowed-scopes.md](.agents/guidelines/git-commit-allowed-scopes.md)
- When changing the CI workflows or `ci-*` justfile targets: [.agents/guidelines/ci.guidelines.md](.agents/guidelines/ci.guidelines.md)
- When picking up backlog work, change requests or PRs (`.agents/changes/`), including
  Parallel Change Requests Orchestration: [.agents/guidelines/prd-workflow.guidelines.md](.agents/guidelines/prd-workflow.guidelines.md)
- Shared vocabulary (UI and code terms): [.agents/glossary/common.md](.agents/glossary/common.md). Use these words in code, tests, commits and docs; add new terms there.

## Completion gate

Run `just preflight` after making changes and before considering a task complete. A task is not
complete until preflight passes.

Do not add references from maintained source or tests back to the white-paper repository. Do not
commit `node_modules/`, `out/`, or Python virtual-environment files.
