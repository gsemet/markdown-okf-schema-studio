# Markdown OKF-Schema Studio

This repository is the standalone source for the Markdown OKF-Schema Studio VS Code extension.
It is MIT licensed and is developed independently from the Agentic Coding White Paper repository.

## Structure

- `src/` contains the TypeScript extension implementation.
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
- Run formatting, TypeScript, unit, contract, and security checks: `just check`
- Run the Python Sphinx source-mapping contract: `just sphinx-check`
- Run end-to-end tests: `just e2e`
- Package a VSIX: `just package`
- Run the complete validation and site-generation pipeline: `just preflight`
- Set up a CI machine from the lock files: `just dev-ci`
- CI jobs (run in parallel by `.github/workflows/ci.yml`, in sequence by `just preflight`):
  `just ci-static`, `just ci-visual`, `just ci-integration`, then `just ci-report` (merges the
  visual and integration outputs) and `just ci-gallery` (gallery and site from existing outputs)
- CI only: `just ci-stress [REPEAT]` repeats the flake-prone real-input scenarios in one VS Code
  window (job `stress`; see rule 12 of the CI guidelines)

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
