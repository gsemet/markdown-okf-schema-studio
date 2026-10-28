"""Pick the CI run whose end-to-end reports the Pages site is built from.

The run must be the newest heavy run (workflow ``ci.yml``, event ``workflow_dispatch``) of the exact
commit that finished green, whose ``integration`` job succeeded and that still holds the three
report artifacts. Prints the run id, or nothing when no run qualifies (the caller then runs the
suite itself).
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from typing import Any, Callable

WORKFLOW = "ci.yml"
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


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", required=True, help="owner/name")
    parser.add_argument("--sha", required=True, help="commit whose heavy run to find")
    args = parser.parse_args(argv)
    base = f"repos/{args.repo}/actions"
    runs = gh_api(
        f"{base}/workflows/{WORKFLOW}/runs?head_sha={args.sha}&event={EVENT}&status=success&per_page=100",
        "workflow_runs",
    )
    found = select_run(
        runs,
        args.sha,
        lambda rid: gh_api(f"{base}/runs/{rid}/jobs?per_page=100", "jobs"),
        lambda rid: gh_api(f"{base}/runs/{rid}/artifacts?per_page=100", "artifacts"),
    )
    if found is None:
        print(f"no green heavy run with report artifacts for {args.sha}", file=sys.stderr)
        return 0
    print(found)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
