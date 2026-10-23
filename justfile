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
    uv sync --group docs --group release
    uv run --no-sync --group docs playwright install chromium

# Set up a CI machine (CI only: npm ci replaces node_modules) from the lock files; the runner provides Node.js.
dev-ci:
    #!/usr/bin/env bash
    set -euo pipefail
    if [[ "$(uname -s)" == "Linux" ]] && ! { command -v plantuml && command -v dot; } >/dev/null; then
        # A stalled or IPv6-only mirror connection must fail and retry (a run spent 28 minutes on a
        # 90 MB download at 53 kB/s, another hung for an hour), not wait for the job timeout.
        apt_options=(-o Acquire::Retries=5 -o Acquire::http::Timeout=30 -o Acquire::https::Timeout=30 -o Acquire::ForceIPv4=true)
        sudo -n apt-get "${apt_options[@]}" update
        sudo -n apt-get "${apt_options[@]}" install --yes --no-install-recommends plantuml graphviz
    fi
    {{ npm }} ci
    uv sync --group docs --group release
    uv run --no-sync --group docs playwright install --with-deps chromium

# Upgrade dependencies from npmjs.org and PyPI and refresh the development environment.
update:
    fnm install
    {{ npm }} exec --yes --package=npm-check-updates -- ncu --upgrade --reject @types/node,@types/vscode --registry https://registry.npmjs.org/
    rm -rf node_modules package-lock.json
    {{ npm }} install --package-lock-only --ignore-scripts
    {{ npm }} install --save-dev @types/node@24 --package-lock-only --ignore-scripts
    {{ npm }} ci
    uv sync --upgrade --group docs --group release
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
check: format compile unit contracts security release-tests

# Test version updates, automatic tagging, and release-note validation in isolation.
release-tests:
    uv run --group docs --group release pytest test/build/test_release.py

# Generate user-facing notes for an exact Git range with gh copilot.
release-notes FROM_REF TO_REF OUTPUT="release-notes.md":
    uv run python scripts/release_notes.py --from-ref "{{ FROM_REF }}" --to-ref "{{ TO_REF }}" --output "{{ OUTPUT }}"

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

# CI job "static": justfile format check, TypeScript, unit, contract and security checks, Sphinx contract.
ci-static:
    #!/usr/bin/env bash
    set -uo pipefail
    if just --unstable --fmt --check && just check && just sphinx-check; then
        echo "ci-static: passed"
    else
        echo "ci-static: FAILED" >&2
        exit 1
    fi

# CI job "visual": the visual end-to-end stage, reports under out/reports/e2e.
ci-visual:
    #!/usr/bin/env bash
    set -uo pipefail
    eval "$(node scripts/e2e-campaign.mjs begin visual)"
    if {{ npm }} run test:visual; then
        echo "ci-visual: passed"
    else
        echo "ci-visual: FAILED" >&2
        exit 1
    fi

# CI job "integration": the VS Code integration end-to-end stage, reports under out/reports/e2e.
ci-integration:
    #!/usr/bin/env bash
    set -uo pipefail
    eval "$(node scripts/e2e-campaign.mjs begin integration)"
    if {{ npm }} run test:integration; then
        echo "ci-integration: passed"
    else
        echo "ci-integration: FAILED" >&2
        exit 1
    fi

# CI job "report": merge the visual and integration outputs into the review index and e2e manifest.
ci-report:
    #!/usr/bin/env bash
    set -uo pipefail
    failed=0
    {{ npm }} run compile || failed=1
    {{ npm }} run review:finish || failed=1
    node scripts/e2e-campaign.mjs report || failed=1
    if [[ "$failed" -eq 0 ]]; then
        echo "ci-report: passed"
    else
        echo "ci-report: FAILED" >&2
        exit 1
    fi

# CI job "gallery": generate the gallery and the site from existing end-to-end outputs.
ci-gallery:
    #!/usr/bin/env bash
    set -uo pipefail
    if {{ npm }} run site:gallery && {{ npm }} run site; then
        echo "ci-gallery: passed"
    else
        echo "ci-gallery: FAILED" >&2
        exit 1
    fi

# Run formatting and all preflight validation stages (the ci-* targets in sequence).
preflight: clean format
    #!/usr/bin/env bash
    set +e
    failures=0
    just ci-static || failures=$((failures + 1))
    just ci-visual || failures=$((failures + 1))
    just ci-integration || failures=$((failures + 1))
    just ci-report || failures=$((failures + 1))
    just ci-gallery || failures=$((failures + 1))
    if [[ "$failures" -ne 0 ]]; then
        echo "$failures preflight stage(s) failed" >&2
        exit 1
    fi

# Package the extension as a VSIX.
package:
    {{ npm }} run package

# Compute the next npm version and create a signed-off version commit, without tagging.
bump-version:
    uv run --group release python scripts/version.py

# Set X.Y.Z and create a signed-off version commit, without tagging.
version VERSION:
    uv run --group release python scripts/version.py "{{ VERSION }}"

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
