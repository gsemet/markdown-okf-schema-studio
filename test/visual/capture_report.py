"""The run manifest, review index and machine-check report of a visual campaign.

The full run, a partial run and a part run (``capture.py``) and the merge of the parts
(``merge_parts.py``) write them through this module, so they read the same. It drives no browser.
"""

from __future__ import annotations

import hashlib
import json
import pathlib


def report_names(partial: bool = False, part: int | None = None) -> tuple[str, str, str]:
    """The file names of the run manifest, the index and the machine report of a run. A partial
    run (--scenario, --group) or a part run (--part) lists a subset: it never replaces the files
    of the full campaign."""
    suffix = f".part-{part}" if part else ".partial" if partial else ""
    return f"run-manifest{suffix}.json", f"INDEX{suffix}.md", f"MACHINE-CHECKS{suffix}.md"


def result_counts(results: list[dict]) -> dict[str, int]:
    return {
        "scenarioCount": len(results),
        "pngCount": sum(len(result.get("captures", [])) for result in results),
        "stepPngCount": sum(1 for result in results for capture in result.get("captures", []) if capture["step"]),
        "screenshotCount": sum(bool(result.get("capture")) for result in results),
        "passedScenarioCount": sum(result["status"] == "passed" for result in results),
        "failedScenarioCount": sum(result["status"] == "failed" for result in results),
    }


def identical_images(screenshot_dir: pathlib.Path, results: list[dict]) -> list[list[str]]:
    """The groups of different capture files of these results that hold the same PNG (H1)."""
    files_by_digest: dict[str, dict[str, None]] = {}
    for result in results:
        for capture in result.get("captures", []):
            digest = hashlib.sha256((screenshot_dir / capture["file"]).read_bytes()).hexdigest()
            files_by_digest.setdefault(digest, {})[capture["file"]] = None
    return [list(files) for files in files_by_digest.values() if len(files) > 1]


def fail_identical_images(results: list[dict], groups: list[list[str]]) -> list[str]:
    """Fail every result that owns a file of an identical group; one failure detail per group."""
    owner_of_file = {capture["file"]: result for result in results for capture in result.get("captures", [])}
    details = []
    for files in groups:
        detail = f"unintended identical PNGs: {', '.join(files)}"
        details.append(detail)
        for result in {id(owner_of_file[name]): owner_of_file[name] for name in files}.values():
            result["failures"].append(detail)
            result["status"] = "failed"
    return details


def _machine_report(scenarios: list[dict], results: list[dict]) -> str:
    required = {scenario["id"]: scenario.get("machineChecks", []) for scenario in scenarios}
    rows = []
    for result in results:
        for check in result.get("finalState", {}).get("machineChecks") or []:
            if check["applicable"] and not check["pass"]:
                mode = "required" if check["id"] in required[result["id"]] else "report-only"
                rows.append(f"| {result['id']} | {check['id']} | {mode} | {check['detail'].replace('|', '/')} |")
    report = ["# Machine checks", "",
              "Failing applicable geometry checks per scenario. `required` checks fail the run; "
              "`report-only` checks are recorded and do not.", "",
              f"Scenarios: {len(results)}; failing applicable checks: {len(rows)}.", ""]
    if rows:
        report.extend(["| Scenario | Check | Mode | Detail |", "| --- | --- | --- | --- |", *rows])
    else:
        report.append("No failing applicable checks.")
    return "\n".join(report) + "\n"


def _index(render_manifest: dict, run_manifest: dict, manifest_name: str, machine_name: str) -> str:
    groups = {group["id"]: group for group in render_manifest.get("groups", [])}
    index = ["# Visual Review", "", f"Run status: **{run_manifest['status']}**", "",
             f"Machine checks: [{machine_name}]({machine_name}) (failing applicable geometry checks)", "",
             f"Revision: `{run_manifest['revision']}`", "",
             f"See [run manifest]({manifest_name}) for command, dirty status and assertions.",
             "", str(render_manifest.get("limitations", "Static generated HTML with mock host.")), ""]
    group = None
    for result in run_manifest["results"]:
        if result["group"] != group:
            group = result["group"]
            index.extend([f"## {groups[group]['title']} (`{group}`)", ""])
        canonical = result.get("screenshotOf") or result["id"]
        alias = f" (alias of {canonical}; assertions retained)" if result.get("screenshotOf") else ""
        if result.get("screenshotOf") is None and not result.get("capture"):
            index.append(f"{result['sequence']}. **{result['status']}** {result['id']} (assertion-only: no screenshot)")
        else:
            index.append(f"{result['sequence']}. **{result['status']}** [{result['id']}](visual/{canonical}.png) [notes](visual/{canonical}.json){alias}")
        index.append(f"   {result['expectedContent']}")
        for detail in result["failures"]:
            index.append(f"   Failure: {detail}")
    return "\n".join(index) + "\n"


def write_reports(directory: pathlib.Path, render_manifest: dict, run_manifest: dict) -> None:
    """Write the run manifest, then the machine report and the index built from it, under the names
    of its kind: full, partial (``partial``) or one part (``part``)."""
    part = run_manifest.get("part")
    manifest_name, index_name, machine_name = report_names(run_manifest["partial"], part)
    (directory / manifest_name).write_text(json.dumps(run_manifest, indent=2) + "\n", encoding="utf-8")
    (directory / machine_name).write_text(
        _machine_report(render_manifest["scenarios"], run_manifest["results"]), encoding="utf-8"
    )
    # A partial run's index has always linked the full run's machine report.
    link = machine_name if part else "MACHINE-CHECKS.md"
    (directory / index_name).write_text(_index(render_manifest, run_manifest, manifest_name, link), encoding="utf-8")
