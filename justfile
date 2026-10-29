set dotenv-load

npm := env("STUDIO_NPM", "fnm exec -- npm --registry=https://registry.npmjs.org/")
okfreq := env("STUDIO_OKFREQ", "uv run --no-sync --group requirements okfreq")

_default:
    @just --list --list-heading $'Available Studio targets:\n'

# Format the justfile.
format:
    just --unstable --fmt

# Set up Node.js, JavaScript and Python dependencies, and Chromium for tests.
dev:
    fnm install
    {{ npm }} ci
    uv sync --group docs --group release --group requirements
    uv run --no-sync --group docs playwright install chromium

# Set up a CI machine (CI only: npm ci replaces node_modules) from the lock files; the runner provides Node.js.
# `just dev-ci visual` also installs what only the visual stage uses: Chromium with its system
# libraries and fonts, plantuml and graphviz.
dev-ci STAGE="":
    #!/usr/bin/env bash
    set -euo pipefail
    case "{{ STAGE }}" in
        "" | visual) ;;
        *)
            echo "dev-ci: unknown stage '{{ STAGE }}' (expected nothing or 'visual')" >&2
            exit 1
            ;;
    esac
    {{ npm }} ci
    uv sync --group docs --group release --group requirements
    [[ "{{ STAGE }}" == "visual" ]] || exit 0
    if [[ "$(uname -s)" != "Linux" ]]; then
        uv run --no-sync --group docs playwright install --with-deps chromium
        exit 0
    fi
    # The Ubuntu mirror sometimes serves a runner at 50-100 kB/s (115 MB of packages then outlast
    # the job timeout), so apt installs from .cache/apt-archives, which CI caches: a cached package
    # is never downloaded again. A stalled connection fails after 30 s instead of hanging.
    archives=.cache/apt-archives
    mkdir -p "$archives"
    shopt -s nullglob
    cached=("$archives"/*.deb)
    echo "dev-ci: ${#cached[@]} package archive(s) restored from $archives"
    if ((${#cached[@]})); then
        sudo -n cp "${cached[@]}" /var/cache/apt/archives/
    fi
    apt_options=(-o Acquire::http::Timeout=30 -o Acquire::https::Timeout=30 -o Acquire::ForceIPv4=true)
    sudo -n apt-get "${apt_options[@]}" update
    if ! { command -v plantuml && command -v dot; } >/dev/null; then
        sudo -n apt-get "${apt_options[@]}" install --yes --no-install-recommends plantuml graphviz
    fi
    # Playwright runs its own apt-get install, which uses the same archive folder.
    uv run --no-sync --group docs playwright install --with-deps chromium
    # Keep only the archives of the current package versions for the next run.
    sudo -n apt-get autoclean
    rm -f "$archives"/*.deb
    used=(/var/cache/apt/archives/*.deb)
    if ((${#used[@]})); then
        cp "${used[@]}" "$archives"/
    fi
    echo "dev-ci: ${#used[@]} package archive(s) saved to $archives"

# Upgrade dependencies from npmjs.org and PyPI and refresh the development environment.
update:
    fnm install
    {{ npm }} exec --yes --package=npm-check-updates -- ncu --upgrade --reject @types/node,@types/vscode --registry https://registry.npmjs.org/
    rm -rf node_modules package-lock.json
    {{ npm }} install --package-lock-only --ignore-scripts
    {{ npm }} install --save-dev @types/node@24 --package-lock-only --ignore-scripts
    {{ npm }} ci
    uv sync --upgrade --group docs --group release --group requirements
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

# Check the import boundaries between the layers of src/ (dependency-cruiser; rules in .dependency-cruiser.cjs).
check-boundaries:
    {{ npm }} run check:boundaries

# Check the file-size ratchet (scripts/file-size-baseline.json) and the type-check suppressions of src/.
check-limits:
    {{ npm }} run check:limits

# Check the companion marker files (*.markers.ts): host file exists, markers name existing requirements.
check-markers:
    {{ npm }} run check:markers

# Check that every runtime export of src/ is used by another module of src/, test/ or scripts/ (allow-list: scripts/unused-exports-allowlist.json).
check-exports:
    {{ npm }} run check:exports

# Check that the package.json settings schema matches the settings registry (src/core/configuration/settingsRegistry.ts).
check-settings:
    {{ npm }} run check:settings

# Generate the package.json settings schema from the settings registry (src/core/configuration/settingsRegistry.ts).
generate-settings:
    {{ npm }} run generate:settings

# Format the justfile and run TypeScript, boundary, size, unused-export, marker companion, settings schema, unit, contract, security and requirements checks.
check: format compile check-boundaries check-limits check-exports check-markers check-settings unit contracts security release-tests requirements-lint

# Audit the production npm dependencies against the registry advisories (online): fails on high or critical.
audit:
    {{ npm }} audit --omit=dev --audit-level=high

# Validate the okfreq requirements bundle: schemas, links, navigation and generated coverage.
requirements-lint:
    {{ okfreq }} validate requirements --check-links --project-root .
    {{ okfreq }} lint requirements --check --check-links --project-root .
    {{ okfreq }} update-coverage requirements --check

# Refresh generated coverage fields and navigation after adding requirements or markers.
requirements-update:
    {{ okfreq }} update-coverage requirements
    {{ okfreq }} lint requirements --prose --check-links --project-root .

# Write the requirements traceability report (JSON and Markdown) under out/reports/requirements.
requirements-report:
    mkdir -p out/reports/requirements
    {{ okfreq }} generate-report requirements \
        --output-json out/reports/requirements/requirements-report.json \
        --output-summary-md out/reports/requirements/requirements-report.md
    {{ okfreq }} status requirements

# Test version updates, automatic tagging, and release-note validation in isolation.
release-tests:
    uv run --group docs --group release --group requirements pytest test/build/test_release.py test/build/test_select_e2e_run.py test/build/test_workflows.py test/build/test_plugin_manifests.py test/build/test_table_bar_flow.py

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

# Build the site from end-to-end reports already under out/reports (for example downloaded CI artifacts).
site-assemble: requirements-report
    {{ npm }} run compile
    {{ npm }} run site:gallery
    {{ npm }} run site

# Build the site after end-to-end tests and the requirements report.
site: e2e site-assemble

# Find the latest green heavy CI run of a commit for the Pages build: prints run_id=<id> and artifact=<its newest reports artifact>, nothing if none.
site-run REPO SHA:
    uv run --no-sync python scripts/select_e2e_run.py --repo "{{ REPO }}" --sha "{{ SHA }}"

# Dry run of the Pages build, no tag and no deploy: download the reports of RUN_ID, assemble out/site.
site-from-run RUN_ID:
    #!/usr/bin/env bash
    set -euo pipefail
    rm -rf out/reports out/reports-download
    mkdir -p out/reports
    # The merged reports artifact (both end-to-end stages) of the newest attempt that ran the
    # report job: artifact names end with -attempt-<n>, as "Re-run failed jobs" keeps the run id.
    artifact="$(uv run --no-sync python scripts/select_e2e_run.py --repo '{owner}/{repo}' --reports-artifact-of "{{ RUN_ID }}")"
    gh run download "{{ RUN_ID }}" --name "$artifact" --dir out/reports-download
    cp -R out/reports-download/. out/reports/
    rm -rf out/reports-download
    just site-assemble

# CI job "static": justfile format check, TypeScript, boundary, size, marker companion, settings schema, unit, contract, security and requirements checks, online npm audit, Sphinx contract, requirements report.
ci-static:
    #!/usr/bin/env bash
    set -uo pipefail
    if just --unstable --fmt --check && just check && just audit && just sphinx-check && just requirements-report; then
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

# CI job "integration", after its test step whatever its outcome (a hang cancels that step at its
# timeout): append the process list and the tails of the VS Code logs left in the temporary
# user-data directories to out/reports/e2e/hang-dumps/post-step/. Diagnostics only: never fails.
ci-hang-dump:
    #!/usr/bin/env bash
    set -u
    target=out/reports/e2e/hang-dumps/post-step
    mkdir -p "$target" || exit 0
    {
        echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ)"
        # `timeout` is GNU coreutils, absent on stock macOS: plain ps there.
        bounded() { if command -v timeout >/dev/null 2>&1; then timeout 10 "$@"; else "$@"; fi; }
        bounded ps -eo pid,ppid,etime,stat,pcpu,rss,args --forest 2>/dev/null || bounded ps -axo pid,ppid,etime,stat,pcpu,rss,args
    } >>"$target/ps.txt" 2>&1 || true
    for profile in /tmp/studio-*-d-* /tmp/studio-reload-*/profile; do
        [[ -d "$profile/logs" ]] || continue
        name="$(basename "$(dirname "$profile")")-$(basename "$profile")"
        mkdir -p "$target/$name" || continue
        while IFS= read -r log; do
            relative="${log#"$profile/logs/"}"
            tail -n 300 "$log" >>"$target/$name/${relative//\//__}" 2>/dev/null || true
        done < <(find "$profile/logs" -name '*.log' -type f 2>/dev/null)
    done
    echo "ci-hang-dump: done ($target)"

# Filter with STUDIO_STRESS_SCENARIOS=name,name (test/shared/stressPlan.ts). CI only: it opens VS
# Code windows, and preflight already runs each of these scenarios once.
# CI job "stress": repeat the flake-prone real-window scenarios REPEAT times, in the trusted window
# then in the Restricted Mode window (one window each).
ci-stress REPEAT="20":
    #!/usr/bin/env bash
    set -uo pipefail
    export STUDIO_REAL_INPUT_SCENARIO=stress STUDIO_STRESS_REPEAT="{{ REPEAT }}"
    # 20 rounds take about 18 minutes in the trusted window: the 15-minute launch deadline of the
    # hang watchdog (test/shared/hangWatchdog.ts) would cut a healthy run; 26 still fails before the job.
    export STUDIO_LAUNCH_TIMEOUT_MS="${STUDIO_LAUNCH_TIMEOUT_MS:-1560000}"
    if {{ npm }} run test:integration -- --trusted-only && node out/test/integration/run-tests.js --untrusted-only; then
        echo "ci-stress: passed ({{ REPEAT }} rounds)"
    else
        echo "ci-stress: FAILED" >&2
        exit 1
    fi

# CI job "report": merge the visual and integration outputs into the review index and e2e manifest.
# STAGES=visual: the real VS Code stage did not run (the pull request path of CI); it is reported as
# skipped and only the visual stage counts.
ci-report STAGES="all":
    #!/usr/bin/env bash
    set -uo pipefail
    case "{{ STAGES }}" in
        all) only="" ;;
        visual) only="--visual-only" ;;
        *) echo "ci-report: STAGES must be all or visual, got {{ STAGES }}" >&2; exit 2 ;;
    esac
    failed=0
    {{ npm }} run compile || failed=1
    {{ npm }} run review:finish -- $only || failed=1
    node scripts/e2e-campaign.mjs report $only || failed=1
    if [[ "$failed" -eq 0 ]]; then
        echo "ci-report: passed"
    else
        echo "ci-report: FAILED" >&2
        exit 1
    fi

# CI job "gallery": generate the requirements report, the gallery and the site from existing end-to-end outputs.
ci-gallery:
    #!/usr/bin/env bash
    set -uo pipefail
    if just requirements-report && {{ npm }} run site:gallery && {{ npm }} run site; then
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
