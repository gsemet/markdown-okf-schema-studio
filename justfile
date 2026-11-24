set dotenv-load

# On Windows npm is npm.cmd, which `fnm exec` does not find from the bare name.
npm := env("STUDIO_NPM", "fnm exec -- " + (if os_family() == "windows" { "npm.cmd" } else { "npm" }) + " --registry=https://registry.npmjs.org/")
okfreq := env("STUDIO_OKFREQ", "uv run --no-sync --group requirements okfreq")

_default:
    @just --list --list-heading $'Available Studio targets:\n'

# Format the justfile.
format:
    just --unstable --fmt

# On Windows, turn on Git long paths for the repository, so a checkout or a new worktree never
# fails with "Filename too long"; nothing outside a Git work tree.
[private]
[windows]
_git-long-paths:
    #!/usr/bin/env bash
    set -eu
    if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        git config core.longpaths true
    fi

# Linux and macOS: nothing to do.
[private]
[unix]
_git-long-paths:

# Set up Node.js, JavaScript and Python dependencies, and Chromium for tests; on Windows, also turn
# on Git long paths (`core.longpaths`) for the repository.
dev: _git-long-paths
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
    # Fast path: the cached archives are every package the last run installed (plantuml, graphviz,
    # Chromium's libraries), so install them from the files with no mirror contacted, then
    # Chromium without --with-deps (that would run apt-get update), and prove it starts. An
    # unreachable mirror otherwise costs minutes of apt-get update timeouts. Any failure (a new
    # runner image, a new package) takes the full path below.
    installed_from_cache=false
    if ((${#cached[@]})); then
        files=()
        for archive in "${cached[@]}"; do files+=("$PWD/$archive"); done
        if sudo -n apt-get "${apt_options[@]}" install --yes --no-install-recommends --no-download "${files[@]}" \
            && command -v plantuml >/dev/null && command -v dot >/dev/null \
            && uv run --no-sync --group docs playwright install chromium \
            && uv run --no-sync --group docs python -c 'from playwright.sync_api import sync_playwright as s; p = s().start(); p.chromium.launch().close(); p.stop()'; then
            installed_from_cache=true
            echo "dev-ci: system packages installed from $archives, no mirror contacted"
        else
            echo "dev-ci: the cached archives are not enough; refreshing the package lists" >&2
        fi
    fi
    if ! "$installed_from_cache"; then
        sudo -n apt-get "${apt_options[@]}" update
        if ! { command -v plantuml && command -v dot; } >/dev/null; then
            sudo -n apt-get "${apt_options[@]}" install --yes --no-install-recommends plantuml graphviz
        fi
        # Playwright runs its own apt-get install, which uses the same archive folder.
        uv run --no-sync --group docs playwright install --with-deps chromium
    fi
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
    {{ npm }} exec --yes --package=npm-check-updates -- ncu --upgrade --reject @types/node,@types/vscode,@types/vscode-min --registry https://registry.npmjs.org/
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

# Type-check src/ against @types/vscode 1.95, the engines.vscode minimum (tsconfig.vscode-min.json), so no API newer than 1.95 slips in.
check-min-vscode:
    {{ npm }} run check:min-vscode

# Check the import boundaries between the layers of src/ (dependency-cruiser; rules in .dependency-cruiser.cjs).
check-boundaries:
    {{ npm }} run check:boundaries

# Check the file-size ratchet (scripts/file-size-baseline.json) and the type-check suppressions of src/.
check-limits:
    {{ npm }} run check:limits

# Check the requirement markers: a source marker on every in-force SwRS, at most 3 IDs per marker block, companion marker lines that name their target (baseline: scripts/marker-baseline.json).
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

# Format the justfile and run TypeScript, minimum-VS-Code type, boundary, size, unused-export, marker companion, settings schema, clip kit storyboard, unit, contract, security and requirements checks.
check: format compile check-min-vscode check-boundaries check-limits check-exports check-markers check-settings clip-kit-test unit contracts security release-tests release-notes-check requirements-lint

# Audit the production npm dependencies against the registry advisories (online): fails on high or critical.
audit:
    {{ npm }} audit --omit=dev --audit-level=high

# Validate the okfreq requirements bundle: schemas, links, navigation, generated coverage, the Main paths citations and the use case diagrams.
requirements-lint:
    {{ okfreq }} validate requirements --check-links --project-root .
    {{ okfreq }} lint requirements --check --check-links --project-root .
    {{ okfreq }} update-coverage requirements --check
    uv run --no-sync --group requirements python scripts/check_main_paths.py requirements
    {{ npm }} run check:diagrams

# Refresh generated coverage fields, OKF fields (status, verified, Links) and navigation after adding requirements or markers.
requirements-update:
    {{ okfreq }} update-coverage requirements
    {{ okfreq }} lint requirements --prose --check-links --project-root .

# Write only the JSON requirements traceability report (no Markdown summary, no status) under out/reports/requirements.
requirements-report-json:
    mkdir -p out/reports/requirements
    {{ okfreq }} generate-report requirements --output-json out/reports/requirements/requirements-report.json

# Write the requirements traceability report (JSON and Markdown) under out/reports/requirements.
requirements-report:
    mkdir -p out/reports/requirements
    {{ okfreq }} generate-report requirements \
        --output-json out/reports/requirements/requirements-report.json \
        --output-summary-md out/reports/requirements/requirements-report.md
    {{ okfreq }} status requirements

# Test version updates, automatic tagging, and release-note validation in isolation.
release-tests:
    uv run --group docs --group release --group requirements pytest test/build/test_release.py test/build/test_select_e2e_run.py test/build/test_guideline_isolation.py test/build/test_workflows.py test/build/test_plugin_manifests.py test/build/test_table_bar_flow.py test/build/test_check_main_paths.py test/build/test_no_merge_commits.py test/build/test_changelog_refs.py

# Check that the current version has valid release notes under docs/releases-notes/.
release-notes-check:
    uv run --no-sync python scripts/release_notes.py --check

# Run security tests.
security:
    {{ npm }} run test:security

# Validate the Sphinx source-mapping contract.
sphinx-check:
    mkdir -p out/reports/contract
    uv run --no-sync --group docs pytest sphinx/tests/test_sphinx_preview_mapping.py --junitxml=out/reports/contract/tests-sphinx.xml

# Private: stop with exit code 3 when the screen is locked (the real VS Code window cannot become active).
# STUDIO_SCREEN_LOCKED=1 forces it on every OS (tests); the real probe runs on macOS only.
_require-unlocked-screen STAGE="ci-integration":
    #!/usr/bin/env bash
    set -uo pipefail
    locked=0
    if [[ "${STUDIO_SCREEN_LOCKED:-}" == "1" ]]; then
        locked=1
    elif [[ "{{ os() }}" == "macos" ]] && ioreg -n Root -d1 2>/dev/null | grep -Eq '"CGSSessionScreenIsLocked"[[:space:]]*=[[:space:]]*Yes'; then
        locked=1
    fi
    if [[ "$locked" -eq 1 ]]; then
        {
            echo "{{ STAGE }}: screen locked, the VS Code window cannot become active; the real VS Code tests did not run."
            echo "Unlock the screen and run it again, or prove the branch in CI at once:"
            echo "  gh workflow run ci.yml --ref <branch> -f heavy=true"
            echo "To keep the screen from locking during an unattended run, see \"App-window tests\" in"
            echo ".agents/guidelines/local-worktree.guidelines.md (caffeinate)."
        } >&2
        exit 3
    fi

# Run integration tests.
integration: (_require-unlocked-screen "integration")
    {{ npm }} run test:integration

# Run visual tests.
visual:
    {{ npm }} run test:visual

# Run end-to-end tests.
e2e: (_require-unlocked-screen "e2e")
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

# Fail when the commits of the branch (BASE..HEAD) include a merge commit; the branch is updated by rebase only.
check-no-merge-commits BASE="origin/main":
    bash "{{ replace(justfile_directory(), '\', '/') }}/scripts/check-no-merge-commits.sh" "{{ BASE }}"

# Print the base ref of the merge-commit check: the target branch of the pull request or merge request (GitHub or GitLab), else origin/main.
[private]
_merge-check-base:
    #!/usr/bin/env bash
    set -eu
    target="${GITHUB_BASE_REF:-${CI_MERGE_REQUEST_TARGET_BRANCH_NAME:-}}"
    echo "origin/${target:-main}"

# CI job "static": no merge commit in the branch, justfile format check, TypeScript, minimum-VS-Code type, boundary, size, marker companion, settings schema, unit, contract, security and requirements checks, online npm audit, Sphinx contract, requirements report.
ci-static:
    #!/usr/bin/env bash
    set -uo pipefail
    base="$(just _merge-check-base)"
    if just check-no-merge-commits "$base" && just --unstable --fmt --check && just check && just audit && just sphinx-check && just requirements-report; then
        echo "ci-static: passed"
    else
        echo "ci-static: FAILED" >&2
        exit 1
    fi

# CI job "visual": the visual end-to-end stage, reports under out/reports/e2e, then the table
# breakout width tests in Chromium (which must start: STUDIO_REQUIRE_CHROMIUM=1), report under
# out/reports/breakout/. Both run even when the first fails, so one run reports both.
ci-visual:
    #!/usr/bin/env bash
    set -uo pipefail
    eval "$(node scripts/e2e-campaign.mjs begin visual)"
    failed=0
    {{ npm }} run test:visual || failed=1
    STUDIO_REQUIRE_CHROMIUM=1 {{ npm }} run test:breakout || failed=1
    if [ "$failed" = 0 ]; then
        echo "ci-visual: passed"
    else
        echo "ci-visual: FAILED" >&2
        exit 1
    fi

# CI job "viewer-graph": compile, write the JSON requirements report, then the use case map overlap tests in
# Chromium (STUDIO_REQUIRE_CHROMIUM=1, reading that report), report under out/reports/viewer-graph/, captures under
# out/reports/requirements-viewer-graph/.
ci-viewer-graph:
    #!/usr/bin/env bash
    set -uo pipefail
    if {{ npm }} run compile && just requirements-report-json && STUDIO_REQUIRE_CHROMIUM=1 STUDIO_REQUIRE_REQUIREMENTS_REPORT=1 {{ npm }} run test:viewer-graph; then
        echo "ci-viewer-graph: passed"
    else
        echo "ci-viewer-graph: FAILED" >&2
        exit 1
    fi

# CI job "integration": the VS Code integration end-to-end stage, reports under out/reports/e2e.
ci-integration: (_require-unlocked-screen "ci-integration")
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
# then in the Restricted Mode window (one window each). The rounds come from the argument, else from
# STUDIO_STRESS_REPEAT (the workflow_dispatch input); STUDIO_STRESS_SCENARIOS (comma-separated names)
# narrows the scenarios. REPEAT must be an integer from 1 to 100. One scenario run costs about 4 s;
# the launch deadline is computed from the plan (2 min plus 6 s per scenario run, at most 24 min,
# test/shared/hangWatchdog.ts). The default 11 rounds of all 21 trusted scenarios take about 15 min (231 runs at 3.7 to 4.1 s).
# Up to about 220 scenario runs per window (rounds times scenarios) fit under the ceiling: 11 rounds
# of all 21, 60 rounds of 3, 100 rounds of 2. Above that, narrow STUDIO_STRESS_SCENARIOS.
ci-stress REPEAT=env("STUDIO_STRESS_REPEAT", "11"): (_require-unlocked-screen "ci-stress")
    #!/usr/bin/env bash
    set -uo pipefail
    repeat={{ quote(REPEAT) }}
    if ! [[ "$repeat" =~ ^[0-9]+$ ]] || (( 10#$repeat < 1 || 10#$repeat > 100 )); then
        echo "ci-stress: REPEAT must be an integer from 1 to 100, got $repeat" >&2
        exit 2
    fi
    export STUDIO_REAL_INPUT_SCENARIO=stress STUDIO_STRESS_REPEAT="$repeat"
    if {{ npm }} run test:integration -- --trusted-only && node out/test/integration/run-tests.js --untrusted-only; then
        echo "ci-stress: passed ($repeat rounds)"
    else
        echo "ci-stress: FAILED" >&2
        exit 1
    fi

# CI job "toc-loop" (workflow_dispatch input toc_loop): repeats the steps STEPS (default
# readme-html,toc,myst-blocks, the three that reopen the side bar) ROUNDS times in the trusted
# window to force the edit-toggle flake. CONTROL=1 closes the side bar before each step. DELAY_MS > 0
# injects a random 0..DELAY_MS pause around the toggle's clicks and the host theme change. Failed
# rounds are counted, not fatal. The launch deadline is computed from the rounds and the steps
# (test/shared/tocLoop.ts), never set here. The parameters are exported variables (never spliced
# into the script). CI only: it opens a VS Code window.
ci-toc-loop $STUDIO_TOC_LOOP="30" $STUDIO_TOGGLE_DELAY_MS="0" $STUDIO_TOC_LOOP_STEPS="" $STUDIO_TOC_LOOP_CONTROL="0":
    #!/usr/bin/env bash
    set -uo pipefail
    export STUDIO_REAL_INPUT_SCENARIO=toc-loop
    if {{ npm }} run test:integration -- --trusted-only; then
        echo "ci-toc-loop: finished ($STUDIO_TOC_LOOP rounds of ${STUDIO_TOC_LOOP_STEPS:-the default steps}, control $STUDIO_TOC_LOOP_CONTROL, delay up to $STUDIO_TOGGLE_DELAY_MS ms)"
    else
        echo "ci-toc-loop: FAILED" >&2
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
# On Windows only the static stage runs: the other stages need Linux or macOS and run in CI.
preflight: clean format
    #!/usr/bin/env bash
    set +e
    failures=0
    just ci-static || failures=$((failures + 1))
    if [[ "{{ os() }}" == "windows" ]]; then
        echo "preflight: visual, viewer-graph, integration, report and gallery stages skipped on Windows; CI runs them"
        exit "$failures"
    fi
    if ! just _require-unlocked-screen preflight >/dev/null 2>&1; then
        echo "preflight: the screen is locked; ci-integration will stop unless it is unlocked before then" >&2
    fi
    just ci-visual || failures=$((failures + 1))
    just ci-viewer-graph || failures=$((failures + 1))
    just ci-integration
    integration=$?
    if [[ "$integration" -eq 3 ]]; then
        failures=$((failures + 1))
        echo "ci-report: skipped, integration did not run (screen locked)" >&2
        echo "ci-gallery: skipped, integration did not run (screen locked)" >&2
    else
        [[ "$integration" -eq 0 ]] || failures=$((failures + 1))
        just ci-report || failures=$((failures + 1))
        just ci-gallery || failures=$((failures + 1))
    fi
    if [[ "$failures" -ne 0 ]]; then
        echo "$failures preflight stage(s) failed" >&2
        exit 1
    fi

# Make or remake a feature clip (docs/demo-video/clips/NAME); STEP: doctor, setup, take, render, check or all.
clip NAME STEP="all" *ARGS:
    fnm exec -- node docs/demo-video/clip-kit/clip.mjs docs/demo-video/clips/{{ NAME }} {{ STEP }} {{ ARGS }}

# Test the feature clip kit's storyboard parser (docs/demo-video/clip-kit/lib/*.test.mjs; no ffmpeg, no VS Code).
clip-kit-test:
    fnm exec -- node scripts/node-test.mjs clip-kit "docs/demo-video/clip-kit/lib/*.test.mjs"

# Package the extension as a VSIX.
package:
    {{ npm }} run package

# Compute the next npm version and create a version commit, without tagging.
bump-version:
    uv run --group release python scripts/version.py

# Add the commit of each line of ## Unreleased in CHANGELOG.md (release, before the changelog heading).
changelog-refs BASE="origin/main" *ARGS:
    uv run --no-sync python scripts/changelog_refs.py --base "{{ BASE }}" {{ ARGS }}

# Set X.Y.Z and create a version commit, without tagging.
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

# Mutation campaign on src/core (CR-450, not part of check or preflight; hours on the whole of src/core): compile, TS 7 checker self-test (stops on failure), core phase, others phase (holes only), report in out/reports/mutation/summary.md. Optional sample: comma-separated globs of src/core files (or env STUDIO_MUTATION_FILES).
mutation-core sample="":
    {{ npm }} run compile
    fnm exec -- node scripts/mutation/ts7-checker.mjs --self-test
    rm -f out/reports/mutation/core/hole-ranges.json
    STUDIO_MUTATION_FILES="${STUDIO_MUTATION_FILES:-{{ sample }}}" fnm exec -- node node_modules/@stryker-mutator/core/bin/stryker.js run scripts/stryker.config.mjs
    fnm exec -- node scripts/mutation-report.mjs --others-ranges
    if [ "$(fnm exec -- node -p 'require("./out/reports/mutation/core/hole-ranges.json").length')" != "0" ]; then STUDIO_MUTATION_FILES="${STUDIO_MUTATION_FILES:-{{ sample }}}" fnm exec -- node node_modules/@stryker-mutator/core/bin/stryker.js run scripts/stryker.others.config.mjs; else echo "mutation-core: no hole, others phase skipped"; rm -rf out/reports/mutation/others; fi
    fnm exec -- node scripts/mutation-report.mjs
