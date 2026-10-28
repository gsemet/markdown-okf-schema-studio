"""Check the supply-chain rules of the CI workflows and of the justfile."""

from __future__ import annotations

import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
WORKFLOWS = sorted((ROOT / ".github/workflows").glob("*.yml"))
USES = re.compile(r"^\s*(?:-\s+)?uses:\s*(\S+)(.*)$")
PINNED = re.compile(r"^[\w.-]+/[\w./-]+@[0-9a-f]{40}$")


def _jobs(text: str) -> dict[str, str]:
    """Split a workflow into its job blocks (two-space indented keys under ``jobs:``)."""
    body = text.split("\njobs:\n", 1)[1]
    parts = re.split(r"(?m)^  ([\w-]+):\n", body)
    return dict(zip(parts[1::2], parts[2::2]))


@pytest.mark.parametrize("path", WORKFLOWS, ids=lambda p: p.name)
def test_actions_are_pinned_to_a_commit_sha_with_the_tag_in_a_comment(path: Path) -> None:
    for line in path.read_text().splitlines():
        match = USES.match(line)
        if not match or match.group(1).startswith("./"):
            continue
        assert PINNED.match(match.group(1)), f"{path.name}: not SHA-pinned: {line.strip()}"
        assert re.match(r"\s*#\s*v\d", match.group(2)), f"{path.name}: tag comment missing: {line.strip()}"


@pytest.mark.parametrize("path", WORKFLOWS, ids=lambda p: p.name)
def test_every_job_declares_its_own_permissions(path: Path) -> None:
    for name, block in _jobs(path.read_text()).items():
        assert re.search(r"(?m)^    permissions:", block), f"{path.name}: job {name} has no permissions"


@pytest.mark.parametrize("path", WORKFLOWS, ids=lambda p: p.name)
def test_workflow_default_permissions_are_read_only(path: Path) -> None:
    top = re.search(r"(?m)^permissions:\n((?:  .*\n)+)", path.read_text())
    assert top, f"{path.name}: no workflow-level permissions"
    assert "write" not in top.group(1), f"{path.name}: workflow-level write permission"


def test_release_job_keeps_dependency_install_scripts_off() -> None:
    text = (ROOT / ".github/workflows/release.yml").read_text()
    assert "npm ci --ignore-scripts" in text
    assert "patch-myst-imports" not in text


def test_static_ci_target_runs_an_online_audit_of_production_dependencies() -> None:
    justfile = (ROOT / "justfile").read_text()
    audit = re.search(r"(?m)^audit:\n((?:    .*\n)+)", justfile)
    assert audit, "no audit target"
    assert "audit --omit=dev --audit-level=high" in audit.group(1)
    assert "--offline" not in audit.group(1)
    static = re.search(r"(?m)^ci-static:\n((?:    .*\n)+)", justfile)
    assert static and "just audit" in static.group(1)


# A job downstream of a skipped job carries an implicit success() that is false, so it is skipped
# too. The heavy jobs are skipped on push; every job below them must opt out of that default.
CI = ROOT / ".github/workflows/ci.yml"


# `report` merges whatever artifacts exist, including after a failed or skipped job.
REPORTS_WHATEVER_HAPPENED = {"report"}


def _ci_jobs() -> dict[str, dict]:
    import yaml

    return yaml.safe_load(CI.read_text())["jobs"]


def _needs(job: dict) -> list[str]:
    needs = job.get("needs", [])
    return [needs] if isinstance(needs, str) else list(needs)


def _opts_out_of_skip(condition: str) -> bool:
    return "!cancelled()" in condition or "always()" in condition


def _after_a_skippable_job(jobs: dict[str, dict]) -> set[str]:
    """Jobs with a possibly skipped ancestor: skippable jobs propagate through ``needs``."""
    # A job is skippable on its own when it has an ``if`` that does not opt out of the skip.
    skippable = {n for n, j in jobs.items() if "if" in j and not _opts_out_of_skip(str(j["if"]))}
    downstream: set[str] = set()
    changed = True
    while changed:
        changed = False
        for name, job in jobs.items():
            if name not in downstream and any(
                need in skippable or need in downstream for need in _needs(job)
            ):
                downstream.add(name)
                changed = True
    return downstream


# @tests_req SwRS-MDOKFSTUDIO-CORE-076
def test_every_job_after_a_skippable_job_opts_out_of_the_implicit_success() -> None:
    jobs = _ci_jobs()
    for name in sorted(_after_a_skippable_job(jobs)):
        condition = str(jobs[name].get("if", ""))
        if "inputs.heavy" in condition:
            continue  # runs only when the heavy ancestors ran, so nothing above it is skipped
        assert _opts_out_of_skip(condition), f"{name}: needs a skippable job but has no !cancelled()"
        if name in REPORTS_WHATEVER_HAPPENED:
            continue
        # The aggregate job checks every result itself in its script (join(needs.*.result)).
        checked = re.search(r"needs\.[\w-]+\.result", condition) or "join(needs.*.result" in str(jobs[name])
        assert checked, f"{name}: no explicit needs.<job>.result check in: {condition}"


# @tests_req SwRS-MDOKFSTUDIO-CORE-076
def test_tag_release_runs_on_a_push_to_main_when_the_checks_passed() -> None:
    condition = str(_ci_jobs()["tag-release"]["if"])
    for part in ("!cancelled()", "needs.checks.result == 'success'", "github.event_name == 'push'",
                 "github.ref == 'refs/heads/main'"):
        assert part in condition, f"tag-release: {part} missing from: {condition}"


# @tests_req SwRS-MDOKFSTUDIO-CORE-076
@pytest.mark.parametrize("name", ["release", "pages"])
def test_release_and_pages_run_when_a_tag_was_created(name: str) -> None:
    condition = str(_ci_jobs()[name]["if"])
    for part in ("!cancelled()", "needs.tag-release.result == 'success'",
                 "needs.tag-release.outputs.tag != ''"):
        assert part in condition, f"{name}: {part} missing from: {condition}"


# The release workflow checks out the tag. A manual dispatch runs the notes script of the workflow's
# own ref, so a fix on main can release an older tag; tag pushes and workflow_call keep the tag's.
RELEASE = ROOT / ".github/workflows/release.yml"
DISPATCH = "github.event_name == 'workflow_dispatch'"


def _release() -> dict:
    import yaml

    return yaml.safe_load(RELEASE.read_text())


def _release_steps() -> list[dict]:
    return _release()["jobs"]["package"]["steps"]


def _step(name: str) -> dict:
    steps = [step for step in _release_steps() if step.get("name") == name]
    assert len(steps) == 1, f"release.yml: no single step named {name!r}"
    return steps[0]


def _notes_steps() -> list[dict]:
    """Steps that generate notes with Copilot (they call the script with --to-ref)."""
    return [s for s in _release_steps() if "release_notes.py" in str(s.get("run", "")) and "--to-ref" in str(s.get("run", ""))]


def test_release_dispatch_runs_the_notes_script_of_the_workflow_ref() -> None:
    load = _step("Load the release notes script of the workflow ref")
    assert DISPATCH in str(load["if"])
    assert 'git show "$GITHUB_SHA:scripts/release_notes.py"' in load["run"]
    assert '"$RUNNER_TEMP/tools/release_notes.py"' in load["run"]
    step = _step("Generate user-facing release notes (workflow ref script)")
    condition = str(step["if"])
    assert DISPATCH in condition and "inputs.notes != 'placeholder'" in condition
    assert step["run"].strip() == 'uv run python "$RUNNER_TEMP/tools/release_notes.py" --to-ref "$RELEASE_TAG"'
    steps = _release_steps()
    assert steps.index(load) < steps.index(step)


def test_release_tag_and_call_run_the_notes_script_of_the_tag() -> None:
    step = _step("Generate user-facing release notes")
    assert str(step["if"]) == "github.event_name != 'workflow_dispatch'"
    assert step["run"].strip() == 'uv run python scripts/release_notes.py --to-ref "$RELEASE_TAG"'
    checkout = [s for s in _release_steps() if str(s.get("uses", "")).startswith("actions/checkout@")]
    assert len(checkout) == 1
    assert checkout[0]["with"]["ref"] == "${{ inputs.tag || github.ref_name }}"


def test_release_dispatch_can_publish_placeholder_notes(tmp_path: Path) -> None:
    import subprocess

    import importlib.util

    notes_input = _release()[True]["workflow_dispatch"]["inputs"]["notes"]
    assert notes_input["type"] == "choice"
    assert notes_input["default"] == "generated"
    assert set(notes_input["options"]) == {"generated", "placeholder"}
    step = _step("Write placeholder release notes")
    assert str(step["if"]) == f"{DISPATCH} && inputs.notes == 'placeholder'"
    subprocess.run(["bash", "-euo", "pipefail", "-c", step["run"]], cwd=tmp_path, check=True)
    spec = importlib.util.spec_from_file_location("release_notes", ROOT / "scripts/release_notes.py")
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.validate_notes((tmp_path / "release-notes.md").read_text())
    steps = _release_steps()
    upload = _step("Upload validated notes")
    assert upload["with"]["path"] == "release-notes.md"
    assert steps.index(step) < steps.index(upload)


def _git(repository: Path, *arguments: str) -> str:
    import subprocess

    return subprocess.check_output(["git", *arguments], cwd=repository, text=True).strip()


def _verify_tag(repository: Path, tag: str) -> int:
    import os
    import subprocess

    script = _step("Verify release tag")["run"].replace(
        "${{ github.event.repository.default_branch }}", "main"
    )
    assert "${{" not in script
    return subprocess.run(
        ["bash", "-c", script],
        cwd=repository,
        env={**os.environ, "RELEASE_TAG": tag},
        capture_output=True,
    ).returncode


@pytest.fixture
def released_main(tmp_path: Path) -> Path:
    """A main branch at version 1.0.0 tagged v1.0.0, as a dispatch from main checks it out."""
    import json

    (tmp_path / "package.json").write_text(json.dumps({"version": "1.0.0"}))
    (tmp_path / "package-lock.json").write_text(
        json.dumps({"version": "1.0.0", "packages": {"": {"version": "1.0.0"}}})
    )
    for arguments in (
        ["init", "--quiet", "-b", "main"],
        ["config", "user.email", "test@example.com"],
        ["config", "user.name", "Release Test"],
        ["add", "."],
        ["commit", "--quiet", "-m", "chore: version 1.0.0"],
        ["tag", "v1.0.0"],
        ["update-ref", "refs/remotes/origin/main", "main"],
        ["checkout", "--quiet", "--detach", "v1.0.0"],
    ):
        _git(tmp_path, *arguments)
    return tmp_path


def test_release_dispatch_from_main_verifies_an_existing_tag(released_main: Path) -> None:
    assert _verify_tag(released_main, "v1.0.0") == 0


def test_release_tag_verification_rejects_a_tag_not_at_head(released_main: Path) -> None:
    _git(released_main, "checkout", "--quiet", "main")
    _git(released_main, "commit", "--quiet", "--allow-empty", "-m", "fix: later")
    _git(released_main, "update-ref", "refs/remotes/origin/main", "main")
    assert _verify_tag(released_main, "v1.0.0") != 0


def test_release_tag_verification_rejects_a_version_mismatch(released_main: Path) -> None:
    _git(released_main, "tag", "v1.0.1")
    assert _verify_tag(released_main, "v1.0.1") != 0


def test_release_tag_verification_rejects_a_tag_off_main(released_main: Path) -> None:
    _git(released_main, "checkout", "--quiet", "-b", "side")
    _git(released_main, "commit", "--quiet", "--allow-empty", "-m", "fix: side")
    _git(released_main, "tag", "-f", "v1.0.0")
    assert _verify_tag(released_main, "v1.0.0") != 0


def test_release_copilot_token_stays_in_the_notes_steps_env() -> None:
    text = RELEASE.read_text()
    notes_steps = _notes_steps()
    assert len(notes_steps) == 2
    for step in notes_steps:
        assert step["env"] == {"COPILOT_GITHUB_TOKEN": "${{ secrets.COPILOT_GITHUB_TOKEN }}"}
    assert text.count("COPILOT_GITHUB_TOKEN") == 2 * len(notes_steps)
    for step in _release_steps():
        if step not in notes_steps:
            assert "COPILOT_GITHUB_TOKEN" not in str(step), step.get("name")


def test_release_checkout_does_not_persist_credentials() -> None:
    for step in _release_steps():
        if str(step.get("uses", "")).startswith("actions/checkout@"):
            assert step["with"].get("persist-credentials") is False, "checkout must not persist the token"


# The Pages site reuses the end-to-end reports of the latest green heavy run of the tagged commit
# and runs the suite only when there is none.
PAGES = ROOT / ".github/workflows/pages.yml"
SELECT = ROOT / "scripts/select_e2e_run.py"


def _pages() -> dict:
    import yaml

    return yaml.safe_load(PAGES.read_text())


def _pages_step(name: str) -> dict:
    steps = [s for s in _pages()["jobs"]["build-site"]["steps"] if s.get("name", "").startswith(name)]
    assert len(steps) == 1, f"pages.yml: no single step starting with {name!r}"
    return steps[0]


def test_pages_dry_run_needs_no_tag_and_never_deploys() -> None:
    pages = _pages()
    inputs = pages[True]["workflow_dispatch"]["inputs"]
    assert inputs["tag"]["required"] is False
    assert inputs["dry_run"]["type"] == "boolean"
    assert "inputs.dry_run" in str(pages["jobs"]["build-site"]["if"])
    assert pages["jobs"]["deploy-pages"]["needs"] == "build-site"
    assert "!inputs.dry_run" in str(pages["jobs"]["deploy-pages"]["if"])
    assert "environment" not in pages["jobs"]["build-site"]
    assert "pages" not in pages["jobs"]["build-site"]["permissions"]


def test_pages_build_downloads_reports_when_a_run_was_found_and_runs_the_suite_otherwise() -> None:
    used = "steps.usable.outputs.reports == 'true'"
    missing = "steps.usable.outputs.reports != 'true'"
    download = _pages_step("Download the end-to-end reports")
    assert download["if"] == "steps.reports.outputs.run_id != ''"
    assert download["continue-on-error"] is True
    assert download["with"]["run-id"] == "${{ steps.reports.outputs.run_id }}"
    assert download["with"]["name"] == "studio-reports"
    assert "pattern" not in download["with"]
    decide = _pages_step("Decide whether the downloaded reports are used")
    assert "steps.download.outcome" in str(decide["env"])
    assert _pages_step("Build Pages site from the downloaded reports")["run"] == "just site-assemble"
    assert _pages_step("Build Pages site from the downloaded reports")["if"] == used
    fallback = _pages_step("Build Pages site by running the suite")
    assert fallback["if"] == missing and "just site" in fallback["run"]
    assert "site-assemble" not in fallback["run"]
    assert _pages_step("Install the end-to-end suite dependencies")["if"] == missing


def test_pages_validates_a_requested_run_id_and_scopes_the_token_to_the_selection() -> None:
    build = _pages()["jobs"]["build-site"]
    assert "GH_TOKEN" not in build["env"]
    find = _pages_step("Find the end-to-end reports")
    assert "GH_TOKEN" in find["env"]
    assert "--run-id" in find["run"]
    assert "REQUESTED_RUN_ID" in find["env"]
    for step in build["steps"]:
        if step.get("id") != "reports":
            assert "GH_TOKEN" not in step.get("env", {})


def test_pages_tag_verification_only_applies_to_a_real_deployment() -> None:
    assert _pages_step("Verify deployment tag")["if"] == "env.DEPLOYMENT_TAG != ''"


def test_called_pages_workflow_may_read_actions_to_download_reports() -> None:
    assert _ci_jobs()["pages"]["permissions"]["actions"] == "read"
    assert _pages()["permissions"]["actions"] == "read"


def test_site_recipes_keep_the_local_suite_and_add_the_report_only_path() -> None:
    justfile = (ROOT / "justfile").read_text()
    assert re.search(r"(?m)^site: e2e site-assemble$", justfile)
    assemble = re.search(r"(?m)^site-assemble: requirements-report\n((?:    .*\n)+)", justfile)
    assert assemble and "e2e" not in assemble.group(1).replace("e2e-", "")
    assert re.search(r"(?m)^site-from-run RUN_ID:$", justfile)
