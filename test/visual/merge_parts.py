"""Merge the two parts of the visual campaign into the files a full run writes.

CI runs ``capture.py --part 1`` and ``--part 2`` in the jobs ``visual`` and ``visual-2``;
``just ci-report`` runs this step on the downloaded reports before anything reads
``screenshots/run-manifest.json``. ``just ci-visual`` with no part runs it too.

    uv run --no-sync --group docs python test/visual/merge_parts.py
"""

from __future__ import annotations

import json
import pathlib
import sys
from collections import Counter
from datetime import datetime

from capture_report import fail_identical_images, identical_images, report_names, result_counts, write_reports
from capture_support import MANIFEST, SCREENSHOT_DIR

PARTS = (1, 2)


def _refuse(cause: str) -> int:
    sys.stdout.flush()
    print(f"visual parts: refused, {cause}", file=sys.stderr)
    return 1


def _listed(names: list[str]) -> str:
    return ", ".join(names[:5]) + (f" and {len(names) - 5} more" if len(names) > 5 else "")


def _read(path: pathlib.Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _seconds(part: dict) -> int:
    elapsed = datetime.fromisoformat(part["completedAt"]) - datetime.fromisoformat(part["startedAt"])
    return round(elapsed.total_seconds())


def _verdict(result: dict) -> tuple:
    """What must agree when two parts ran one scenario; measured values may differ between runners."""
    return result["status"], sorted(result["failures"]), [capture["file"] for capture in result.get("captures", [])]


def _align_campaign(path: pathlib.Path, parts: list[dict], started_at: str | None) -> None:
    """In CI each part job begins its own campaign under the pinned run id (STUDIO_E2E_RUN_ID), and
    the report job holds the campaign file of one of them, whichever download landed last. The review
    index checks the run manifest against the start time of that file: give it the start of the merged
    run, the earliest part's. A run without a pinned id is left alone: there, a part run again by
    itself starts a new campaign beside the older other part, and the review index must refuse that
    pair. So is a file whose start is no part's own: those parts are the evidence of an earlier one."""
    if started_at is None or not path.exists():
        return
    campaign = _read(path)
    own = {(part.get("runId"), part.get("campaignStartedAt")) for part in parts}
    if campaign.get("pinnedRunId") is True and (campaign.get("runId"), campaign.get("startedAt")) in own:
        campaign["startedAt"] = started_at
        path.write_text(json.dumps(campaign, indent=2) + "\n", encoding="utf-8")


# @implements_req SwRS-MDOKFSTUDIO-CORE-076
def merge_parts(render_manifest_path: pathlib.Path, screenshot_dir: pathlib.Path) -> int:
    """Write ``run-manifest.json``, ``INDEX.md`` and ``MACHINE-CHECKS.md`` from the part manifests
    in ``screenshot_dir``. Returns 1, naming the cause, when the parts do not make one passing full
    run; a failed part and identical PNGs across the parts still write the merged files."""
    part_files = sorted(screenshot_dir.glob("run-manifest.part-*.json"))
    if not part_files:
        full = screenshot_dir / report_names()[0]
        if full.exists() and _read(full).get("partial") is False:
            print("visual parts: none, the full run's manifest stands")
            return 0
        return _refuse(f"the manifests of part 1 and part 2 are missing and no full run manifest stands in for them in {screenshot_dir}")
    parts = sorted((_read(path) for path in part_files), key=lambda part: part["part"])
    for part in parts:
        print(f"visual part {part['part']}: {part['status']}, {part['scenarioCount']} scenarios, {_seconds(part)} s")
    missing = [number for number in PARTS if not (screenshot_dir / report_names(part=number)[0]).exists()]
    if missing:
        return _refuse("; ".join(f"part {number} manifest is missing ({report_names(part=number)[0]})" for number in missing))
    if not render_manifest_path.exists():
        return _refuse(f"the render manifest is missing ({render_manifest_path})")
    render = _read(render_manifest_path)
    for field in ("revision", "runId"):
        if len({part.get(field) for part in parts}) > 1:
            values = ", ".join(f"part {part['part']}: {part.get(field)}" for part in parts)
            return _refuse(f"the parts disagree on {field} ({values}): one is left from another run")

    owners: dict[str, list[dict]] = {}
    for part in parts:
        for result in part["results"]:
            owners.setdefault(result["id"], []).append(result)
    page_of = {entry["id"]: entry["page"] for entry in render["scenarios"]}
    absent = [identifier for identifier in page_of if identifier not in owners]
    if absent:
        return _refuse(f"{len(absent)} scenario(s) of the render manifest are in no part: {_listed(absent)}")
    unknown = [identifier for identifier in owners if identifier not in page_of]
    if unknown:
        return _refuse(f"{len(unknown)} scenario(s) of the parts are not in the render manifest: {_listed(unknown)}")
    differing = [identifier for identifier, found in owners.items() if len({repr(_verdict(result)) for result in found}) > 1]
    if differing:
        return _refuse(f"scenario(s) with different results in two parts: {_listed(differing)}")

    # A canonical scenario that an alias pulled into both parts counts once, and so do its failures.
    results = [owners[identifier][0] for identifier in page_of]
    repeated = Counter(
        (page_of[identifier], detail)
        for identifier, found in owners.items() if len(found) > 1
        for detail in found[0]["failures"]
    )
    failures = list(parts[0]["failures"])
    for part in parts[1:]:
        for failure in part["failures"]:
            key = failure["page"], failure["detail"]
            if repeated[key]:
                repeated[key] -= 1
            else:
                failures.append(failure)
    duplicates = [files for part in parts for files in part["duplicateImages"]]
    try:
        # Each part checked its own PNGs; a group no part reported spans the two.
        across = [files for files in identical_images(screenshot_dir, results)
                  if not any(set(files) <= set(known) for known in duplicates)]
    except FileNotFoundError as error:
        return _refuse(f"a capture of a part is missing: {error.filename}")
    failures.extend({"page": "campaign", "detail": detail} for detail in fail_identical_images(results, across))

    causes = [f"part {part['part']} failed" for part in parts if part["status"] != "passed"]
    causes.extend(f"identical PNGs across the parts: {', '.join(files)}" for files in across)
    earliest = min(parts, key=lambda part: part.get("campaignStartedAt") or "")
    run_manifest = {
        **{key: value for key, value in earliest.items() if key != "part"},
        "startedAt": min(part["startedAt"] for part in parts),
        "completedAt": max(part["completedAt"] for part in parts),
        "worktreeStatus": "\n".join(dict.fromkeys(part["worktreeStatus"] for part in parts if part["worktreeStatus"])),
        "sourceCommand": sys.orig_argv,
        "status": "failed" if causes or failures else "passed",
        "partial": False,
        **result_counts(results),
        "workerCount": max(part["workerCount"] for part in parts),
        "failureCount": len(failures),
        "failures": failures,
        "duplicateImages": duplicates + across,
        "results": results,
        "parts": [part["part"] for part in parts],
    }
    write_reports(screenshot_dir, render, run_manifest)
    _align_campaign(screenshot_dir.parent / "campaign-visual.json", parts, run_manifest.get("campaignStartedAt"))
    if causes:
        return _refuse(f"{'; '.join(causes)} ({report_names()[0]} is written with status failed)")
    print("visual parts: merged")
    return 0


if __name__ == "__main__":
    raise SystemExit(merge_parts(MANIFEST, SCREENSHOT_DIR))
