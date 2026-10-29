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
    # The selection names the reports artifact of the newest attempt of that run.
    assert download["with"]["name"] == "${{ steps.reports.outputs.artifact }}"
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


def test_pages_fallback_clears_leftover_reports_before_the_suite() -> None:
    text = (ROOT / ".github/workflows/pages.yml").read_text()
    step = text.split("Decide whether the downloaded reports are used", 1)[1].split("- name:", 1)[0]
    fallback = step.split("else\n", 2)[-1]
    assert "rm -rf out/reports" in fallback
    assert fallback.index("rm -rf out/reports") < fallback.index('echo "reports=false"')


# A version change on main runs the heavy jobs in its own push run, and tag-release tags it only
# when both heavy jobs succeeded; Pages then reuses that run's reports.
def _expression(text: str) -> str:
    """A GitHub expression (`${{ }}` optional) as Python over a ``ctx`` lookup."""
    body = re.sub(r"^\$\{\{\s*|\s*\}\}$", "", str(text).strip())
    body = body.replace("cancelled()", "False")
    body = re.sub(r"\b((?:needs|github|inputs|steps)\.[\w.-]*\w)", r'ctx.get("\1", "")', body)
    body = body.replace("&&", " and ").replace("||", " or ")
    return re.sub(r"!(?!=)", " not ", body)


def _context(event: str, *, bump: str = "", heavy: bool = False, **results: str) -> dict:
    """Context of one run: release-check outputs '' when it was skipped (not a push to main)."""
    values = {
        "github.event_name": event,
        "github.ref": "refs/heads/main",
        "inputs.heavy": heavy,
        "needs.release-check.outputs.bump": bump,
        "needs.release-check.result": "success" if event == "push" else "skipped",
    }
    values.update({f"needs.{job}.result": result for job, result in results.items()})
    return values


def _run_if(condition: object, values: dict) -> object:
    """Evaluate a workflow expression of this repository (missing values read as '')."""
    return eval(_expression(str(condition)), {"ctx": values})  # noqa: S307


# @tests_req SwRS-MDOKFSTUDIO-CORE-076
def test_every_needs_reference_names_a_job_the_job_needs() -> None:
    jobs = _ci_jobs()
    for name, job in jobs.items():
        for need in _needs(job):
            assert need in jobs, f"{name}: needs undeclared job {need!r}"
        for referenced in set(re.findall(r"needs\.([\w-]+)\.", str(job))):
            assert referenced in _needs(job), f"{name}: reads needs.{referenced} without needing it"


# @tests_req SwRS-MDOKFSTUDIO-CORE-076
def test_release_check_detects_a_version_change_on_a_push_to_main() -> None:
    job = _ci_jobs()["release-check"]
    assert _run_if(job["if"], _context("push"))
    assert not _run_if(job["if"], _context("pull_request"))
    assert not _run_if(job["if"], _context("workflow_dispatch", heavy=True))
    assert job["outputs"]["bump"] == "${{ steps.bump.outputs.bump }}"
    step = next(s for s in job["steps"] if s.get("id") == "bump")
    assert 'scripts/version.py --bump-since "$BEFORE_SHA"' in step["run"]
    assert step["env"]["BEFORE_SHA"] == "${{ github.event.before }}"


# @tests_req SwRS-MDOKFSTUDIO-CORE-076
@pytest.mark.parametrize("name", ["integration", "stress"])
def test_heavy_jobs_run_on_a_version_change_push_and_on_a_heavy_dispatch(name: str) -> None:
    job = _ci_jobs()[name]
    assert "release-check" in _needs(job)
    condition = job["if"]
    assert _run_if(condition, _context("push", bump="true"))
    assert _run_if(condition, _context("workflow_dispatch", heavy=True))
    assert not _run_if(condition, _context("push", bump="false"))
    assert not _run_if(condition, _context("pull_request"))
    assert not _run_if(condition, _context("workflow_dispatch", heavy=False))


# @tests_req SwRS-MDOKFSTUDIO-CORE-076
def test_stress_blocks_only_a_version_change() -> None:
    flag = _ci_jobs()["stress"]["continue-on-error"]
    assert _run_if(flag, _context("push", bump="false"))
    assert _run_if(flag, _context("workflow_dispatch", heavy=True))
    assert not _run_if(flag, _context("push", bump="true"))


# @tests_req SwRS-MDOKFSTUDIO-CORE-076
def test_report_merges_the_real_window_stage_of_a_version_change() -> None:
    job = _ci_jobs()["report"]
    step = next(s for s in job["steps"] if "just ci-report" in str(s.get("run", "")))
    mode = re.search(r"\$\{\{(.*)\}\}", step["run"]).group(1)
    assert _run_if(mode, _context("push", bump="true")) == "all"
    assert _run_if(mode, _context("workflow_dispatch", heavy=True)) == "all"
    assert _run_if(mode, _context("push", bump="false")) == "visual"
    assert _run_if(mode, _context("pull_request")) == "visual"


def _tag_steps() -> tuple[dict, dict]:
    steps = _ci_jobs()["tag-release"]["steps"]
    refuse = next(s for s in steps if s.get("name") == "Refuse to tag a version change without a green heavy run")
    tag = next(s for s in steps if s.get("id") == "tag")
    assert steps.index(refuse) < steps.index(tag)
    return refuse, tag


# @tests_req SwRS-MDOKFSTUDIO-CORE-076
def test_tag_release_needs_the_heavy_jobs_and_runs_on_every_push_to_main() -> None:
    job = _ci_jobs()["tag-release"]
    assert {"checks", "release-check", "integration", "stress"} <= set(_needs(job))
    assert "needs.release-check.result == 'success'" in str(job["if"])
    green = {"checks": "success", "integration": "success", "stress": "success"}
    assert _run_if(job["if"], _context("push", bump="true", **green))
    # Without a version change the heavy jobs are skipped and the job still runs (no tag).
    assert _run_if(job["if"], _context("push", bump="false", checks="success", integration="skipped", stress="skipped"))
    # ... but red checks skip it, as before this change.
    assert not _run_if(job["if"], _context("push", bump="false", checks="failure", integration="skipped", stress="skipped"))
    # On a version change a red heavy job or red checks do not skip the job: its first step
    # explains why nothing is tagged. An integration failure fails report, hence checks.
    assert _run_if(job["if"], _context("push", bump="true", checks="success", integration="success", stress="failure"))
    assert _run_if(job["if"], _context("push", bump="true", checks="failure", integration="failure", stress="success"))
    assert _run_if(job["if"], _context("push", bump="true", checks="failure", integration="success", stress="success"))
    # A failed release-check, another event or a cancelled run skips it.
    failed_check = {**_context("push", bump="", **green), "needs.release-check.result": "failure"}
    assert not _run_if(job["if"], failed_check)
    assert not _run_if(job["if"], _context("pull_request", **green))
    assert not _run_if(job["if"], {**_context("push", bump="true", **green), "github.ref": "refs/heads/other"})
    assert "!cancelled()" in str(job["if"])


# @tests_req SwRS-MDOKFSTUDIO-CORE-076
@pytest.mark.parametrize(
    ("bump", "checks", "integration", "stress", "tags"),
    [
        ("true", "success", "success", "success", True),
        # Realistic: an integration failure (or hang) fails report, then checks.
        ("true", "failure", "failure", "success", False),
        ("true", "failure", "failure", "failure", False),
        ("true", "failure", "cancelled", "success", False),
        ("true", "success", "success", "failure", False),
        ("true", "success", "success", "cancelled", False),
        # A static or visual failure alone on a version change.
        ("true", "failure", "success", "success", False),
        ("true", "success", "skipped", "skipped", False),
        ("false", "success", "skipped", "skipped", True),
    ],
)
def test_tag_step_requires_checks_and_both_heavy_jobs_on_a_version_change(
    bump: str, checks: str, integration: str, stress: str, tags: bool
) -> None:
    job = _ci_jobs()["tag-release"]
    refuse, tag = _tag_steps()
    values = _context("push", bump=bump, checks=checks, integration=integration, stress=stress)
    assert _run_if(job["if"], values)
    assert bool(_run_if(tag["if"], values)) is tags
    assert bool(_run_if(refuse["if"], values)) is not tags


# @tests_req SwRS-MDOKFSTUDIO-CORE-076
def test_every_untagged_version_change_explains_why() -> None:
    """Truth table over every result: on a version change that reaches tag-release, exactly one of
    the two steps runs, and the tag step runs only when checks and both heavy jobs succeeded."""
    import itertools

    job = _ci_jobs()["tag-release"]
    refuse, tag = _tag_steps()
    results = ["success", "failure", "cancelled", "skipped"]
    for checks, integration, stress in itertools.product(results, repeat=3):
        for bump in ("true", "false"):
            values = _context("push", bump=bump, checks=checks, integration=integration, stress=stress)
            green = checks == "success" and (bump == "false" or integration == stress == "success")
            if bump == "false" and checks != "success":
                assert not _run_if(job["if"], values), values
                continue
            assert _run_if(job["if"], values), values
            assert bool(_run_if(tag["if"], values)) is green, values
            assert bool(_run_if(refuse["if"], values)) is (bump == "true" and not green), values


# @tests_req SwRS-MDOKFSTUDIO-CORE-076
def test_refused_tag_names_each_heavy_result_in_the_job_summary(tmp_path: Path) -> None:
    import os
    import subprocess

    refuse, _ = _tag_steps()
    assert refuse["env"] == {
        "CHECKS": "${{ needs.checks.result }}",
        "INTEGRATION": "${{ needs.integration.result }}",
        "STRESS": "${{ needs.stress.result }}",
        "RUN_ID": "${{ github.run_id }}",
    }
    summary = tmp_path / "summary.md"
    result = subprocess.run(
        ["bash", "-e", "-c", refuse["run"]],
        env={**os.environ, "GITHUB_STEP_SUMMARY": str(summary), "CHECKS": "failure", "INTEGRATION": "failure",
             "STRESS": "skipped", "RUN_ID": "4242"},
        capture_output=True,
        text=True,
    )
    assert result.returncode != 0
    text = summary.read_text()
    assert "Release not tagged" in text and "tagging was skipped" in text
    assert "- checks: failure" in text and "- integration: failure" in text and "- stress: skipped" in text
    # The recovery path: re-run the failed jobs of this same run.
    assert "`gh run rerun 4242 --failed`" in text and "Re-run failed" in text
    assert "checks: failure, integration: failure, stress: skipped" in result.stdout


# @tests_req SwRS-MDOKFSTUDIO-CORE-076
def test_pages_reuses_the_reports_of_the_release_run_when_its_heavy_jobs_are_green() -> None:
    job = _ci_jobs()["pages"]
    assert {"tag-release", "integration", "stress"} <= set(_needs(job))
    flag = job["with"]["reports_from_caller"]
    assert _run_if(flag, {"needs.integration.result": "success", "needs.stress.result": "success"})
    assert not _run_if(flag, {"needs.integration.result": "success", "needs.stress.result": "skipped"})
    call = _pages()[True]["workflow_call"]["inputs"]["reports_from_caller"]
    assert call["type"] == "boolean" and call["default"] is False
    find = _pages_step("Find the end-to-end reports")
    assert find["env"]["FROM_CALLER"] == "${{ inputs.reports_from_caller }}"
    fetch = _pages_step("Fetch the end-to-end reports of the calling run")
    assert fetch["if"] == "steps.reports.outputs.from_caller == 'true'"
    assert fetch["continue-on-error"] is True
    # This run (no run-id), under the name the caller's report job uploaded in its newest attempt.
    assert fetch["with"] == {"name": "${{ steps.reports.outputs.artifact }}", "path": "out/reports/"}
    decide = _pages_step("Decide whether the downloaded reports are used")
    found, download = decide["env"]["FOUND"], decide["env"]["DOWNLOAD"]
    caller = {"steps.reports.outputs.from_caller": "true", "steps.reports.outputs.run_id": "",
              "github.run_id": "42", "steps.download-caller.outcome": "success", "steps.download.outcome": "skipped"}
    assert _run_if(found, caller) == "42"
    assert _run_if(download, caller) == "success"
    selected = {"steps.reports.outputs.run_id": "7", "steps.download-caller.outcome": "skipped",
                "steps.download.outcome": "failure"}
    assert _run_if(found, selected) == "7"
    assert _run_if(download, selected) == "failure"


# "Re-run failed jobs" keeps the run id: an artifact uploaded under a fixed name exists once per
# attempt, and a download by that name returned the attempt-1 artifact. Every artifact name of
# ci.yml therefore carries the attempt that uploaded it, and every consumer downloads the name the
# producing job reports (a job that was not re-run keeps its attempt-1 outputs and artifact).
ATTEMPT_SUFFIX = "-attempt-${{ github.run_attempt }}"
UPLOAD = "actions/upload-artifact@"
DOWNLOAD = "actions/download-artifact@"


def _uploads(jobs: dict[str, dict]) -> dict[str, list[str]]:
    return {name: [s["with"]["name"] for s in job.get("steps", []) if UPLOAD in str(s.get("uses", ""))]
            for name, job in jobs.items()}


def _downloads(steps: list[dict]) -> list[dict]:
    return [s for s in steps if DOWNLOAD in str(s.get("uses", ""))]


# @tests_req SwRS-MDOKFSTUDIO-CORE-076
def test_every_ci_artifact_name_carries_the_attempt() -> None:
    names = [name for names in _uploads(_ci_jobs()).values() for name in names]
    assert names, "ci.yml uploads no artifact"
    for name in names:
        assert name.endswith(ATTEMPT_SUFFIX), f"artifact {name!r} does not end with {ATTEMPT_SUFFIX!r}"
    assert len(set(names)) == len(names), f"two jobs upload the same name: {names}"


# @tests_req SwRS-MDOKFSTUDIO-CORE-076
@pytest.mark.parametrize(("job", "base"), [("visual", "e2e-visual"), ("integration", "e2e-integration"),
                                           ("report", "studio-reports")])
def test_a_consumed_artifact_is_announced_by_its_job(job: str, base: str) -> None:
    import importlib.util

    spec = importlib.util.spec_from_file_location("select_e2e_run", SELECT)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    assert base in module.REQUIRED_ARTIFACTS  # the Pages selection reads the same names
    assert _uploads(_ci_jobs())[job] == [base + ATTEMPT_SUFFIX]
    assert _ci_jobs()[job]["outputs"]["artifact"] == base + ATTEMPT_SUFFIX


# @tests_req SwRS-MDOKFSTUDIO-CORE-076
def test_every_ci_download_names_the_artifact_of_the_job_it_needs() -> None:
    jobs = _ci_jobs()
    uploads = _uploads(jobs)
    seen = 0
    for name, job in jobs.items():
        for step in _downloads(job.get("steps", [])):
            seen += 1
            wanted = step["with"].get("name") or step["with"].get("pattern")
            match = re.fullmatch(r"\$\{\{ needs\.([\w-]+)\.outputs\.artifact \}\}", str(wanted))
            assert match, f"{name}: downloads {wanted!r}, not a producing job's artifact output"
            producer = match.group(1)
            assert producer in _needs(job), f"{name}: reads the artifact of {producer} without needing it"
            assert jobs[producer]["outputs"]["artifact"] in uploads[producer]
            assert "run-id" not in step["with"], f"{name}: downloads from another run"
    assert seen >= 3  # report (visual, integration) and gallery


# @tests_req SwRS-MDOKFSTUDIO-CORE-076
def test_report_merges_each_stage_from_the_attempt_that_produced_it() -> None:
    job = _ci_jobs()["report"]
    steps = _downloads(job["steps"])
    patterns = [s["with"]["pattern"] for s in steps]
    assert patterns == ["${{ needs.visual.outputs.artifact }}", "${{ needs.integration.outputs.artifact }}"]
    for step in steps:
        # pattern (not name): a missing artifact (skipped or timed-out job) downloads nothing and
        # ci-report says which stage is missing; merge-multiple writes into out/reports/ directly.
        assert step["with"]["path"] == "out/reports/" and step["with"]["merge-multiple"] is True
        assert "*" not in step["with"]["pattern"]
    # Integration failed on attempt 1 and was re-run: visual keeps attempt 1, integration is attempt 2.
    rerun = {"needs.visual.outputs.artifact": "e2e-visual-attempt-1",
             "needs.integration.outputs.artifact": "e2e-integration-attempt-2"}
    assert [_run_if(p, rerun) for p in patterns] == ["e2e-visual-attempt-1", "e2e-integration-attempt-2"]
    # An empty pattern would download every artifact: a job without an output (integration
    # skipped, a job that never started) downloads nothing.
    for step, producer in zip(steps, ("visual", "integration")):
        assert _run_if(step["if"], rerun)
        assert not _run_if(step["if"], {**rerun, f"needs.{producer}.outputs.artifact": ""})


# @tests_req SwRS-MDOKFSTUDIO-CORE-076
def test_pages_gets_the_reports_artifact_of_the_newest_report_attempt() -> None:
    job = _ci_jobs()["pages"]
    assert "report" in _needs(job)
    assert job["with"]["reports_artifact"] == "${{ needs.report.outputs.artifact }}"
    call = _pages()[True]["workflow_call"]["inputs"]["reports_artifact"]
    assert call["type"] == "string" and call["default"] == ""
    assert _pages_step("Find the end-to-end reports")["env"]["CALLER_ARTIFACT"] == "${{ inputs.reports_artifact }}"
    downloads = _downloads(_pages()["jobs"]["build-site"]["steps"])
    assert [d["with"]["name"] for d in downloads] == ["${{ steps.reports.outputs.artifact }}"] * 2


def _find_reports(tmp_path: Path, **env: str) -> tuple[int, dict[str, str], str]:
    """Run the find step of pages.yml with a fake `uv` that stands for the selection script."""
    import os
    import subprocess

    bin_dir = tmp_path / "bin"
    bin_dir.mkdir(exist_ok=True)
    fake = bin_dir / "uv"
    fake.write_text("#!/usr/bin/env bash\necho \"$*\" >> \"$UV_CALLS\"\nprintf '%s' \"$SELECTION\"\n")
    fake.chmod(0o755)
    output = tmp_path / "output"
    output.write_text("")
    calls = tmp_path / "uv-calls"
    calls.write_text("")
    step = _pages_step("Find the end-to-end reports")
    result = subprocess.run(
        ["bash", "-c", step["run"]],
        env={**os.environ, "PATH": f"{bin_dir}{os.pathsep}{os.environ['PATH']}", "GITHUB_OUTPUT": str(output),
             "GITHUB_RUN_ID": "42", "GITHUB_REPOSITORY": "o/r", "UV_CALLS": str(calls), "SELECTION": "",
             "REQUESTED_RUN_ID": "", "FROM_CALLER": "false", "CALLER_ARTIFACT": "", **env},
        capture_output=True, text=True, cwd=ROOT,
    )
    values = dict(line.split("=", 1) for line in output.read_text().splitlines() if "=" in line)
    return result.returncode, values, calls.read_text()


# @tests_req SwRS-MDOKFSTUDIO-CORE-076
def test_pages_find_step_outputs_the_run_and_its_reports_artifact(tmp_path: Path) -> None:
    status, values, calls = _find_reports(
        tmp_path, FROM_CALLER="true", CALLER_ARTIFACT="studio-reports-attempt-2")
    assert status == 0 and values == {"from_caller": "true", "artifact": "studio-reports-attempt-2"}
    assert calls == ""
    # The caller did not name its artifact: no guess (an empty name would download every artifact).
    status, values, calls = _find_reports(tmp_path, FROM_CALLER="true", CALLER_ARTIFACT="")
    assert status == 0 and values == {} and calls == ""
    status, values, calls = _find_reports(
        tmp_path, SELECTION="run_id=7\nartifact=studio-reports-attempt-3\n")
    assert status == 0 and values == {"run_id": "7", "artifact": "studio-reports-attempt-3"}
    assert "select_e2e_run.py" in calls
    status, values, _ = _find_reports(tmp_path, SELECTION="")
    assert status == 0 and values == {}


# @tests_req SwRS-MDOKFSTUDIO-CORE-076
def test_site_from_run_downloads_the_reports_of_the_newest_attempt() -> None:
    justfile = (ROOT / "justfile").read_text()
    recipe = re.search(r"(?m)^site-from-run RUN_ID:\n((?:    .*\n)+)", justfile)
    assert recipe, "no site-from-run recipe"
    body = recipe.group(1)
    assert "--reports-artifact-of" in body
    assert re.search(r'gh run download "\{\{ RUN_ID \}\}" --name "\$artifact"', body)
    assert "--name studio-reports " not in body


def test_no_workflow_downloads_a_fixed_artifact_name() -> None:
    for path in WORKFLOWS:
        for job in yaml_jobs(path).values():
            for step in _downloads(job.get("steps", [])):
                wanted = str(step["with"].get("name") or step["with"].get("pattern"))
                assert wanted.startswith("${{"), f"{path.name}: downloads the fixed name {wanted!r}"


def yaml_jobs(path: Path) -> dict[str, dict]:
    import yaml

    return yaml.safe_load(path.read_text())["jobs"]
