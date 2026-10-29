"""Pick the CI run whose end-to-end reports the Pages site is built from.

The run must be the newest heavy run of the exact commit that finished green, whose ``integration``
job succeeded and that still holds the three report artifacts. A heavy run is either a manual one
(workflow ``ci.yml``, event ``workflow_dispatch``) or the release push: the ``push`` run on ``main``
of a version change, where CI runs the heavy jobs itself; such a run qualifies only when both heavy
jobs, ``integration`` and ``stress``, succeeded (not skipped). Prints ``run_id=<id>`` and
``artifact=<name>`` (the merged reports artifact to download, in the ``GITHUB_OUTPUT`` format), or
nothing when no run qualifies (the caller then runs the suite itself).

Attempts: every artifact name of ci.yml ends with ``-attempt-<n>``, the attempt that uploaded it.
"Re-run failed jobs" keeps the run id and uploads the re-run jobs' artifacts again under the new
attempt; a download by the old fixed name returned the attempt-1 artifact. The reports artifact is
therefore the newest attempt of ``studio-reports``; it must still be live and not older than the
newest attempt of a stage artifact (else it does not hold that stage). Names without the suffix
(runs made before it) are not used. ``--reports-artifact-of RUN_ID`` prints only that name, for a
run picked by hand (``just site-from-run``).

Failure policy: a ``gh api`` error or malformed JSON during the automatic selection is logged as a warning and prints
nothing, so the caller falls back to the suite. With ``--run-id`` the run is requested explicitly:
it must pass the same checks, and any mismatch or API error exits non-zero (fail closed).
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from typing import Any, Callable, NamedTuple

WORKFLOW = "ci.yml"
WORKFLOW_PATH = f".github/workflows/{WORKFLOW}"
EVENT = "workflow_dispatch"
# @implements_req SwRS-MDOKFSTUDIO-CORE-076
# The push run of a version change on main runs the heavy jobs itself (ci.yml release-check).
PUSH_EVENT = "push"
PUSH_BRANCH = "main"
EVENTS = (EVENT, PUSH_EVENT)
REPORTS_ARTIFACT = "studio-reports"
STAGE_ARTIFACTS = ("e2e-visual", "e2e-integration")
REQUIRED_ARTIFACTS = (*STAGE_ARTIFACTS, REPORTS_ARTIFACT)
ATTEMPT_NAME = re.compile(r"^(?P<base>.+)-attempt-(?P<attempt>[1-9][0-9]*)$")
REQUIRED_JOB = "integration"
# A push run of main is a heavy run only when both heavy jobs succeeded; without a version change
# they are skipped and the run holds no real-window reports.
PUSH_REQUIRED_JOBS = (REQUIRED_JOB, "stress")


def event_problem(run: dict[str, Any]) -> str | None:
    """Why the run's event cannot hold a heavy run, or None."""
    event = run.get("event")
    if event == EVENT:
        return None
    if event == PUSH_EVENT:
        if run.get("head_branch") != PUSH_BRANCH:
            return f"push run is on branch {run.get('head_branch')!r}, not {PUSH_BRANCH!r}"
        return None
    return f"run event is {event!r}, not one of {', '.join(map(repr, EVENTS))}"


def is_candidate(run: dict[str, Any], sha: str) -> bool:
    """A finished green heavy-capable run of exactly this commit."""
    return (
        run.get("head_sha") == sha
        and event_problem(run) is None
        and run.get("status") == "completed"
        and run.get("conclusion") == "success"
    )


def required_jobs(run: dict[str, Any]) -> tuple[str, ...]:
    return PUSH_REQUIRED_JOBS if run.get("event") == PUSH_EVENT else (REQUIRED_JOB,)


def jobs_succeeded(jobs: list[dict[str, Any]], names: tuple[str, ...]) -> bool:
    return all(any(j.get("name") == name and j.get("conclusion") == "success" for j in jobs) for name in names)


class Selection(NamedTuple):
    run_id: int
    artifact: str


def newest_attempts(artifacts: list[dict[str, Any]]) -> dict[str, tuple[int, dict[str, Any]]]:
    """The newest attempt of each artifact base name, expired or not (names without a suffix are left out)."""
    newest: dict[str, tuple[int, dict[str, Any]]] = {}
    for artifact in artifacts:
        match = ATTEMPT_NAME.match(str(artifact.get("name", "")))
        if not match:
            continue
        attempt = int(match["attempt"])
        if match["base"] not in newest or attempt > newest[match["base"]][0]:
            newest[match["base"]] = (attempt, artifact)
    return newest


def reports_artifact(artifacts: list[dict[str, Any]]) -> tuple[str | None, str | None]:
    """(problem, None), or (None, name of the reports artifact of the newest attempt)."""
    newest = newest_attempts(artifacts)
    for base in REQUIRED_ARTIFACTS:
        if base not in newest:
            return f"missing artifacts: no {base}-attempt-<n> (need {', '.join(REQUIRED_ARTIFACTS)})", None
        if newest[base][1].get("expired"):
            return f"missing or expired artifacts: {newest[base][1]['name']} expired", None
    attempt, reports = newest[REPORTS_ARTIFACT]
    for base in STAGE_ARTIFACTS:
        if newest[base][0] > attempt:
            return f"artifact {reports['name']} is older than {newest[base][1]['name']}", None
    return None, str(reports["name"])


def validate_run(
    run: dict[str, Any],
    sha: str,
    jobs_of: Callable[[int], list[dict[str, Any]]],
    artifacts_of: Callable[[int], list[dict[str, Any]]],
) -> tuple[str | None, str | None]:
    """(problem, None) when an explicitly requested run cannot be used, else (None, reports artifact)."""
    if run.get("path") != WORKFLOW_PATH:
        return f"run belongs to {run.get('path')!r}, not {WORKFLOW_PATH!r}", None
    if run.get("head_sha") != sha:
        return f"run is for commit {run.get('head_sha')!r}, not {sha!r}", None
    problem = event_problem(run)
    if problem:
        return problem, None
    if run.get("status") != "completed" or run.get("conclusion") != "success":
        return f"run did not finish green (status={run.get('status')!r}, conclusion={run.get('conclusion')!r})", None
    run_id = int(run["id"])
    names = required_jobs(run)
    if not jobs_succeeded(jobs_of(run_id), names):
        return f"job {' and '.join(map(repr, names))} did not succeed", None
    return reports_artifact(artifacts_of(run_id))


def select_run(
    runs: list[dict[str, Any]],
    sha: str,
    jobs_of: Callable[[int], list[dict[str, Any]]],
    artifacts_of: Callable[[int], list[dict[str, Any]]],
) -> Selection | None:
    """Newest qualifying run and its reports artifact, or None."""
    for run in sorted(runs, key=lambda r: r.get("created_at", ""), reverse=True):
        if not is_candidate(run, sha):
            continue
        run_id = int(run["id"])
        if not jobs_succeeded(jobs_of(run_id), required_jobs(run)):
            continue
        problem, artifact = reports_artifact(artifacts_of(run_id))
        if problem is None and artifact:
            return Selection(run_id, artifact)
    return None


def gh_api(path: str, key: str) -> list[dict[str, Any]]:
    out = subprocess.check_output(["gh", "api", "--paginate", path], text=True)
    items: list[dict[str, Any]] = []
    # --paginate prints one JSON document per page.
    decoder = json.JSONDecoder()
    index = 0
    while index < len(out):
        while index < len(out) and out[index].isspace():
            index += 1
        if index >= len(out):
            break
        page, index = decoder.raw_decode(out, index)
        items.extend(page.get(key, []))
    return items


def gh_object(path: str) -> dict[str, Any]:
    return json.loads(subprocess.check_output(["gh", "api", path], text=True))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", required=True, help="owner/name")
    parser.add_argument("--sha", default="", help="commit whose heavy run to find")
    parser.add_argument("--run-id", default="", help="validate this run instead of searching")
    parser.add_argument(
        "--reports-artifact-of",
        default="",
        metavar="RUN_ID",
        help="only print the reports artifact of the newest attempt of this run (no other check)",
    )
    args = parser.parse_args(argv)
    if not args.sha and not args.reports_artifact_of:
        parser.error("--sha is required unless --reports-artifact-of is given")
    base = f"repos/{args.repo}/actions"

    def jobs_of(rid: int) -> list[dict[str, Any]]:
        return gh_api(f"{base}/runs/{rid}/jobs?per_page=100", "jobs")

    def artifacts_of(rid: int) -> list[dict[str, Any]]:
        return gh_api(f"{base}/runs/{rid}/artifacts?per_page=100", "artifacts")

    if args.reports_artifact_of:
        try:
            problem, artifact = reports_artifact(artifacts_of(int(args.reports_artifact_of)))
        except (subprocess.CalledProcessError, ValueError, KeyError) as error:
            print(f"error: cannot list the artifacts of run {args.reports_artifact_of}: {error}", file=sys.stderr)
            return 1
        if problem:
            print(f"error: run {args.reports_artifact_of} has no usable reports: {problem}", file=sys.stderr)
            return 1
        print(artifact)
        return 0
    if args.run_id:
        try:
            run = gh_object(f"{base}/runs/{args.run_id}")
            problem, artifact = validate_run(run, args.sha, jobs_of, artifacts_of)
        except (subprocess.CalledProcessError, ValueError, KeyError) as error:
            print(f"error: cannot validate run {args.run_id}: {error}", file=sys.stderr)
            return 1
        if problem:
            print(f"error: run {args.run_id} is not usable: {problem}", file=sys.stderr)
            return 1
        print(f"run_id={run['id']}")
        print(f"artifact={artifact}")
        return 0
    try:
        # One query per event: the API filters on a single event.
        runs = [
            run
            for event in EVENTS
            for run in gh_api(
                f"{base}/workflows/{WORKFLOW}/runs?head_sha={args.sha}&event={event}&status=success&per_page=100",
                "workflow_runs",
            )
        ]
        found = select_run(runs, args.sha, jobs_of, artifacts_of)
    except (subprocess.CalledProcessError, ValueError) as error:
        print(f"warning: GitHub API failed ({error}); the suite runs instead", file=sys.stderr)
        return 0
    if found is None:
        print(f"no green heavy run with report artifacts for {args.sha}", file=sys.stderr)
        return 0
    print(f"run_id={found.run_id}")
    print(f"artifact={found.artifact}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
