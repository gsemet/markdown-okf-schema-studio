set dotenv-load

npm := env("STUDIO_NPM", "fnm exec -- npm --registry=https://registry.npmjs.org/")

_default:
    @just --list --list-heading $'Available Studio targets:\n'

# Format the justfile.
format:
    just --unstable --fmt

# Set up Node.js, JavaScript and Python dependencies, and Chromium for tests.
dev:
    fnm install
    {{ npm }} ci
    uv sync --group docs
    uv run --no-sync --group docs playwright install chromium

# Upgrade dependencies from npmjs.org and PyPI and refresh the development environment.
update:
    fnm install
    {{ npm }} exec --yes --package=npm-check-updates -- ncu --upgrade --reject @types/node,@types/vscode --registry https://registry.npmjs.org/
    rm -rf node_modules package-lock.json
    {{ npm }} install --package-lock-only --ignore-scripts
    {{ npm }} install --save-dev @types/node@24 --package-lock-only --ignore-scripts
    {{ npm }} ci
    uv sync --upgrade --group docs
    uv run --no-sync --group docs playwright install chromium

update-guidelines:
    guidelines update

# Set up the development environment (compatibility entry point).
install: dev

# Remove generated outputs and caches while preserving installed dependencies.
clean:
    rm -rf out .artifacts
    rm -rf .pytest_cache .vscode-test .uv_cache .playwright-cli node_modules/.cache
    find . -type d \( -name .git -o -name node_modules -o -name .venv \) -prune -o -type d -name __pycache__ -prune -exec rm -rf {} +

# Also remove installed dependencies and local environment configuration.
mr-proper: clean
    rm -rf node_modules .venv
    rm -f .env

# Compile the extension TypeScript.
compile:
    {{ npm }} run compile

# Run TypeScript type checks.
check-types:
    {{ npm }} run check-types

# Run unit tests.
unit:
    {{ npm }} run test:unit

# Run contract tests.
contracts:
    {{ npm }} run test:contracts

# Format the justfile and run TypeScript, unit, contract, and security checks.
check: format compile unit contracts security

# Run security tests.
security:
    {{ npm }} run test:security

# Validate the Sphinx source-mapping contract.
sphinx-check:
    mkdir -p out/reports/contract
    uv run --no-sync --group docs pytest sphinx/tests/test_sphinx_preview_mapping.py --junitxml=out/reports/contract/tests-sphinx.xml

# Run integration tests.
integration:
    {{ npm }} run test:integration

# Run visual tests.
visual:
    {{ npm }} run test:visual

# Run end-to-end tests.
e2e:
    {{ npm }} run test:e2e

# Generate the gallery after end-to-end tests.
gallery: e2e
    {{ npm }} run gallery:generate

# Build the site after end-to-end tests.
site: e2e
    {{ npm }} run site:gallery
    {{ npm }} run site

# Run formatting and all preflight validation stages.
preflight: clean format
    #!/usr/bin/env bash
    set +e
    failures=0
    just check || failures=$((failures + 1))
    just sphinx-check || failures=$((failures + 1))
    if {{ npm }} run test:e2e; then
        {{ npm }} run site:gallery || failures=$((failures + 1))
        {{ npm }} run site || failures=$((failures + 1))
    else
        failures=$((failures + 1))
    fi
    if [[ "$failures" -ne 0 ]]; then
        echo "$failures preflight stage(s) failed" >&2
        exit 1
    fi

# Package the extension as a VSIX.
package:
    {{ npm }} run package

# Package and optionally install the VSIX in VS Code.
install-vsix PROFILE="": package
    #!/usr/bin/env bash
    set -euo pipefail
    vsix="out/reports/package/markdown-okf-schema-studio.vsix"
    if ! command -v code >/dev/null 2>&1; then
        echo "VS Code CLI 'code' is unavailable; install manually from $vsix"
        exit 0
    fi
    if [[ -n "{{ PROFILE }}" ]]; then
        code --install-extension "$vsix" --force --profile "{{ PROFILE }}"
    else
        code --install-extension "$vsix" --force
    fi
    echo "Installed $vsix. Reload the VS Code window to activate it."

# Run release validation and package the extension.
release-check:
    {{ npm }} ci
    {{ npm }} run check-types
    {{ npm }} test
    just sphinx-check
    {{ npm }} run package
