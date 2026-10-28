"""Pick the CI run whose end-to-end reports the Pages site is built from.

The run must be the newest heavy run (workflow ``ci.yml``, event ``workflow_dispatch``) of the exact
commit that finished green, whose ``integration`` job succeeded and that still holds the three
report artifacts. Prints the run id, or nothing when no run qualifies (the caller then runs the
suite itself).

Failure policy: a ``gh api`` error during the automatic selection is logged as a warning and prints
nothing, so the caller falls back to the suite. With ``--run-id`` the run is requested explicitly:
it must pass the same checks, and any mismatch or API error exits non-zero (fail closed).
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from typing import Any, Callable

WORKFLOW = "ci.yml"
WORKFLOW_PATH = f".github/workflows/{WORKFLOW}"
EVENT = "workflow_dispatch"
REQUIRED_ARTIFACTS = ("e2e-visual", "e2e-integration", "studio-reports")
REQUIRED_JOB = "integration"


def is_candidate(run: dict[str, Any], sha: str) -> bool:
    """A finished green heavy-capable run of exactly this commit."""
    return (
        run.get("head_sha") == sha
        and run.get("event") == EVENT
        and run.get("status") == "completed"
        and run.get("conclusion") == "success"
    )


def integration_succeeded(jobs: list[dict[str, Any]]) -> bool:
    return any(j.get("name") == REQUIRED_JOB and j.get("conclusion") == "success" for j in jobs)


def has_artifacts(artifacts: list[dict[str, Any]]) -> bool:
    live = {a["name"] for a in artifacts if not a.get("expired")}
    return all(name in live for name in REQUIRED_ARTIFACTS)


def validate_run(
    run: dict[str, Any],
    sha: str,
    jobs_of: Callable[[int], list[dict[str, Any]]],
    artifacts_of: Callable[[int], list[dict[str, Any]]],
) -> str | None:
    """Why an explicitly requested run cannot be used, or None when it qualifies."""
    if run.get("path") != WORKFLOW_PATH:
        return f"run belongs to {run.get('path')!r}, not {WORKFLOW_PATH!r}"
    if run.get("head_sha") != sha:
        return f"run is for commit {run.get('head_sha')!r}, not {sha!r}"
    if run.get("event") != EVENT:
        return f"run event is {run.get('event')!r}, not {EVENT!r}"
    if run.get("status") != "completed" or run.get("conclusion") != "success":
        return f"run did not finish green (status={run.get('status')!r}, conclusion={run.get('conclusion')!r})"
    run_id = int(run["id"])
    if not integration_succeeded(jobs_of(run_id)):
        return f"job {REQUIRED_JOB!r} did not succeed"
    if not has_artifacts(artifacts_of(run_id)):
        return f"missing or expired artifacts (need {', '.join(REQUIRED_ARTIFACTS)})"
    return None


def select_run(
    runs: list[dict[str, Any]],
    sha: str,
    jobs_of: Callable[[int], list[dict[str, Any]]],
    artifacts_of: Callable[[int], list[dict[str, Any]]],
) -> int | None:
    """Newest qualifying run id, or None."""
    for run in sorted(runs, key=lambda r: r.get("created_at", ""), reverse=True):
        if not is_candidate(run, sha):
            continue
        run_id = int(run["id"])
        if integration_succeeded(jobs_of(run_id)) and has_artifacts(artifacts_of(run_id)):
            return run_id
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
    parser.add_argument("--sha", required=True, help="commit whose heavy run to find")
    parser.add_argument("--run-id", default="", help="validate this run instead of searching")
    args = parser.parse_args(argv)
    base = f"repos/{args.repo}/actions"

    def jobs_of(rid: int) -> list[dict[str, Any]]:
        return gh_api(f"{base}/runs/{rid}/jobs?per_page=100", "jobs")

    def artifacts_of(rid: int) -> list[dict[str, Any]]:
        return gh_api(f"{base}/runs/{rid}/artifacts?per_page=100", "artifacts")

    if args.run_id:
        try:
            run = gh_object(f"{base}/runs/{args.run_id}")
            problem = validate_run(run, args.sha, jobs_of, artifacts_of)
        except (subprocess.CalledProcessError, ValueError, KeyError) as error:
            print(f"error: cannot validate run {args.run_id}: {error}", file=sys.stderr)
            return 1
        if problem:
            print(f"error: run {args.run_id} is not usable: {problem}", file=sys.stderr)
            return 1
        print(run["id"])
        return 0
    try:
        runs = gh_api(
            f"{base}/workflows/{WORKFLOW}/runs?head_sha={args.sha}&event={EVENT}&status=success&per_page=100",
            "workflow_runs",
        )
        found = select_run(runs, args.sha, jobs_of, artifacts_of)
    except subprocess.CalledProcessError as error:
        print(f"warning: GitHub API failed ({error}); the suite runs instead", file=sys.stderr)
        return 0
    if found is None:
        print(f"no green heavy run with report artifacts for {args.sha}", file=sys.stderr)
        return 0
    print(found)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
