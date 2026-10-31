"""Screenshot campaign for the MyST live preview.

Opens each rendered page from ``out/reports/visual/manifest.json``, drives it to the
scroll position the scenario asks for, and writes a PNG plus a sidecar note describing
what the frame is meant to prove.

A small set of DOM assertions runs once per page. They encode the regressions that
prompted the campaign: duplicated admonition titles, citation groups breaking a
paragraph in two, admonition colours leaking into following text, and panels that are
indistinguishable from the page background.

The checks live in the ``capture_*`` modules next to this file; this file is the campaign driver.
"""

from __future__ import annotations

import argparse
import glob
import hashlib
import json
import os
import pathlib
import sys
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

from playwright.sync_api import Page, TimeoutError as PlaywrightTimeoutError, sync_playwright

from capture_support import (
  CheckTrace,
  EXTENSION_ROOT,
  Failure,
  MANIFEST,
  MIN_PANEL_CONTRAST,
  PAGE_CHECKS,
  REMOVED_ALIAS_CANONICAL,
  SCREENSHOT_DIR,
  STEP_NAMES,
  StepRecorder,
  VISUAL_SCREENSHOT_DIR,
  count_admonitions,
  count_chart_blocks,
  count_context_tags,
  count_figures,
  count_mermaid_blocks,
  count_plantuml_blocks,
  relative_to_screenshots,
  scenario_png,
)
from capture_page_checks import (
  apply_scroll,
  check_bare_urls,
  check_deferred_frontmatter_links,
  check_edit_activation_scroll,
  check_forced_cream_theme,
  check_forced_white_theme,
  check_frontmatter_rendering,
  check_generic_skill_frontmatter,
  check_inline_code,
  check_inline_code_narrow,
  check_math_rendering,
  check_okf_schema_rendering,
  check_orphan_box,
  sidecar_json,
  stress_frontmatter_scroll,
  stress_sticky_heading_scroll,
)
from capture_layout_checks import (
  WIDTH_BREAK_REPORT_DIR,
  apply_toolbar_state,
  apply_width_shot,
  check_change_bar,
  check_editor_keyboard,
  check_fresh_workspace,
  check_insert_after_figure,
  check_nested_list_typing,
  check_paste_image,
  check_paste_rich_text,
  check_preview_toolbar,
  check_toc_column,
  check_toc_shot,
  check_top_spacing,
  check_update_glow,
  check_width_mode_break,
  check_width_modes,
)
from capture_comment_checks import (
  FIRST_GAP_REPORT_DIR,
  check_code_copy,
  check_comment_chips,
  check_comment_toggle,
  check_edit_affordances,
  check_edit_palette_tall,
  check_figure_anchors,
  check_first_element_gap,
  check_inline_thread,
  check_comment_button_thread,
  check_comment_marks_hidden,
  check_checkbox_refusal,
  check_palette_mode,
  check_slash_menu,
  check_table_toolbar_tall,
)
from capture_width_switch import apply_width_switch
from capture_width_scroll import check_width_mode_scroll
from capture_edit_checks import check_edit_palette, check_edit_palette_clearance, check_preview_edit_mode
from capture_figure_button import check_edit_figure_button
from capture_table_menu import check_table_menu_above_handles
from capture_final_checks import (
  check_content_assertions,
  check_content_contracts,
  check_final_frame,
  check_forced_dark_theme,
  check_horizontal_access,
  check_link_details,
  check_mermaid_error_theme_switch,
  check_mermaid_theme_switch,
  check_page_actions,
  check_sticky_headings,
  check_tooltip_contrast,
  pin_frontmatter_capture,
  show_schema_key_suggestions,
)


def run_scenario(page: Page, scenario: dict, failures: list[Failure], result: dict) -> str:
  trace: CheckTrace = page.check_trace
  expected_mermaid = count_mermaid_blocks(scenario["fixture"])
  if expected_mermaid:
    page.wait_for_function(
      "expected => { const diagrams = [...document.querySelectorAll('.myst-mermaid-diagram')]; "
      "return diagrams.length === expected && diagrams.every(diagram => diagram.dataset.renderState); }",
      arg=expected_mermaid,
    )
    contrast_errors = page.evaluate(r"""async () => {
      const errors = [];
      const luminance = color => {
        const channels = (color.match(/[\d.]+/g) || []).slice(0, 3).map(value => {
          const channel = Number(value) / 255;
          return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
        });
        return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
      };
      for (const image of document.querySelectorAll('img.myst-mermaid-image')) {
        const svg = new DOMParser().parseFromString(await (await fetch(image.src)).text(), 'image/svg+xml').documentElement;
        const host = document.createElement('div');
        host.style.cssText = 'position:fixed;left:-10000px;visibility:hidden';
        host.appendChild(document.importNode(svg, true));
        document.body.appendChild(host);
        const labels = [...host.querySelectorAll('.edgeLabel p, .edgeLabel text')];
        const source = image.closest('.myst-mermaid-diagram')?.querySelector('.myst-mermaid-source')?.textContent || '';
        if (!labels.length && /\|[^|]+\|/.test(source)) errors.push('Mermaid SVG lost expected internal edge labels');
        for (const label of labels) {
          const isSvgText = label.namespaceURI === 'http://www.w3.org/2000/svg';
          const foreground = isSvgText ? getComputedStyle(label).fill : getComputedStyle(label).color;
          let background = 'rgba(0, 0, 0, 0)';
          const labelRect = isSvgText ? label.closest('.edgeLabel')?.querySelector('rect') : null;
          if (labelRect) {
            const fill = getComputedStyle(labelRect).fill;
            if (fill && fill !== 'none' && fill !== 'rgba(0, 0, 0, 0)') background = fill;
          }
          for (let ancestor = label; background === 'rgba(0, 0, 0, 0)' && ancestor && ancestor !== host; ancestor = ancestor.parentElement) {
            const candidate = getComputedStyle(ancestor).backgroundColor;
            if (candidate !== 'rgba(0, 0, 0, 0)' && candidate !== 'transparent') {
              background = candidate;
              break;
            }
          }
          if (background === 'rgba(0, 0, 0, 0)') background = getComputedStyle(document.body).backgroundColor;
          const values = [luminance(foreground), luminance(background)].sort((first, second) => second - first);
          const ratio = (values[0] + .05) / (values[1] + .05);
          if (!Number.isFinite(ratio) || ratio < 4.5) errors.push(`Mermaid edge label "${label.textContent}" contrast is ${ratio.toFixed(2)}:1`);
        }
        host.remove();
      }
      return errors;
    }""")
    for detail in contrast_errors:
      failures.append(Failure(scenario['page'], detail))
  expected_plantuml = count_plantuml_blocks(scenario["fixture"])
  if expected_plantuml:
    # The built-in engine draws in the page after load; the host pipeline sets the state before.
    page.wait_for_function(
      "expected => { const diagrams = [...document.querySelectorAll('.myst-plantuml-diagram')]; "
      "return diagrams.length === expected && diagrams.every(diagram => diagram.dataset.renderState); }",
      arg=expected_plantuml,
    )
  expected_charts = count_chart_blocks(scenario["fixture"])
  if expected_charts:
    # The chart runtime draws after load; wait until every chart is in a settled state.
    page.wait_for_function(
      "expected => { const charts = [...document.querySelectorAll('.myst-vega-diagram')]; "
      "return charts.length === expected && charts.every(chart => chart.dataset.renderState); }",
      arg=expected_charts,
    )
  expected_width = scenario.get("expectedContentWidth")
  if expected_width is not None:
    geometry = page.locator("#sphinx-myst-preview-content").bounding_box()
    if not geometry or abs(geometry["width"] - expected_width) > 1 or abs(geometry["x"] - (scenario["width"] - expected_width) / 2) > 1:
      failures.append(Failure(scenario["page"], f"content is not centered at expected width {expected_width}: {geometry}"))
  checks = PAGE_CHECKS.replace("__MIN_CONTRAST__", str(MIN_PANEL_CONTRAST))
  for placeholder, value in (
    ("__EXPECTED_ADMONITIONS__", count_admonitions(scenario["fixture"]) + count_context_tags(scenario["fixture"])),
    ("__EXPECTED_FIGURES__", count_figures(scenario["fixture"])),
    ("__EXPECTED_MERMAID__", expected_mermaid),
    ("__EXPECTED_PLANTUML__", count_plantuml_blocks(scenario["fixture"])),
    ("__EXPECTED_CONTEXT_TAGS__", count_context_tags(scenario["fixture"])),
    ("__CONTEXT_TAG_CHECKS__", json.dumps(bool(scenario.get("contextTagChecks")))),
    ("__PLANTUML_EXPECTATION__", json.dumps(scenario.get("plantumlExpectation", "none"))),
    ("__MERMAID_EXPECTATION__", json.dumps(scenario.get("mermaidExpectation", "none"))),
  ):
    checks = checks.replace(placeholder, str(value))
  for check in (
    check_fresh_workspace, check_mermaid_theme_switch, check_mermaid_error_theme_switch, check_forced_white_theme, check_forced_cream_theme, check_forced_dark_theme, check_frontmatter_rendering, check_deferred_frontmatter_links,
    check_generic_skill_frontmatter, check_okf_schema_rendering, check_preview_toolbar,
    check_math_rendering, check_bare_urls, check_inline_code, check_inline_code_narrow, check_orphan_box, check_content_contracts,
  ):
    try:
      trace.run(check.__name__, lambda check=check: check(page, scenario, failures))
    except Exception as error:
      failures.append(Failure(scenario["page"], f"{check.__name__}: {error}"))
  for detail in trace.run("page_checks", lambda: page.evaluate(checks)):
    failures.append(Failure(scenario["page"], detail))
  initial_top = page.locator("#sphinx-myst-preview-content").evaluate(
    "element => element.getBoundingClientRect().top + scrollY"
  )
  if scenario.get("fullPage"):
    page.add_style_tag(content="#sphinx-myst-preview-content { padding-bottom: 40px !important; }")
  position = apply_scroll(page, scenario["scroll"])
  result["actions"].append(position)
  for check in (
    apply_width_switch, apply_toolbar_state, check_edit_activation_scroll, check_preview_edit_mode, check_top_spacing, check_first_element_gap, check_width_modes, apply_width_shot, check_width_mode_break, check_width_mode_scroll, check_toc_column, check_toc_shot, check_figure_anchors, check_comment_chips, check_comment_toggle, check_comment_button_thread, check_comment_marks_hidden, check_checkbox_refusal, check_inline_thread, check_change_bar, check_update_glow, check_code_copy, check_page_actions, check_content_assertions, check_edit_affordances, check_edit_palette, check_edit_palette_clearance, check_edit_figure_button, check_table_menu_above_handles, check_edit_palette_tall, check_table_toolbar_tall, check_palette_mode, check_slash_menu, check_insert_after_figure, check_nested_list_typing, check_editor_keyboard, check_paste_rich_text, check_paste_image, stress_frontmatter_scroll,
    stress_sticky_heading_scroll, check_horizontal_access, check_link_details,
  ):
    try:
      trace.run(check.__name__, lambda check=check: check(page, scenario, failures))
      if trace.counts.get(check.__name__):  # only checks that worked on the page (H5)
        result["actions"].append(check.__name__)
    except Exception as error:
      failures.append(Failure(scenario["page"], f"{check.__name__}: {error}"))
  page.wait_for_timeout(120)
  if scenario.get("editTarget") in {"frontmatter-key", "frontmatter-value"}:
    trace.run("pin_frontmatter_capture", lambda: pin_frontmatter_capture(page, scenario, failures))
  if scenario.get("editTarget") == "frontmatter-key":
    key_input = page.locator('input[aria-label="Frontmatter key status"][list]')
    if key_input.count() != 1:
      failures.append(Failure(scenario["page"], "frontmatter key suggestion input is missing"))
    else:
      key_input.fill("s")
      key_input.press("ArrowDown")
      page.wait_for_timeout(100)
      show_schema_key_suggestions(page, scenario, failures)
  if scenario.get("expectedStickyHeadings"):
    trace.run("check_sticky_headings", lambda: check_sticky_headings(page, scenario, failures, initial_top))
  trace.run("check_tooltip_contrast", lambda: check_tooltip_contrast(page, scenario, failures))
  return position


# NOTE: test/site/e2eGroups.test.ts reads the check code: the capture_*.py modules and this file
# up to the next line. Keep `def capture_scenarios` as the first function of the campaign driver.
def capture_scenarios(page_directory: pathlib.Path, scenarios: list[dict]) -> tuple[list[dict], list[Failure]]:
    failures: list[Failure] = []
    results: list[dict] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            # The Mermaid renderer is an ES module with chunks; Chromium refuses module scripts on file:// otherwise.
            args=["--allow-file-access-from-files"],
        )
        try:
            for scenario in scenarios:
                start_failures = len(failures)
                result = {"id": scenario["id"], "sequence": scenario.get("sequence"),
                          "group": scenario["group"], "screenshotOf": scenario.get("screenshotOf"),
                          "expectedContent": scenario["description"],
                          "actions": [], "finalState": {}}
                # Opt-in stopgap (retryOnTimeout): only a Playwright timeout is retried, so a real
                # visual diff or any other failure is never hidden by a second attempt.
                attempts_allowed = 1 + (int(scenario.get("retryOnTimeout") or 0) if scenario.get("timeoutMs") else 0)
                attempt_log = []
                for attempt in range(1, attempts_allowed + 1):
                    timed_out = False
                    del failures[start_failures:]
                    result.update({"actions": [], "finalState": {}})
                    context = browser.new_context(
                        viewport={"width": scenario["width"], "height": scenario["height"]},
                        device_scale_factor=2,
                        # CR 046: no motion in the campaign, so every reading and capture is of a settled
                        # page; check_update_glow turns it back on for its own patch.
                        reduced_motion="reduce",
                    )
                    if scenario.get("mathRenderingChecks"):
                        context.set_offline(True)
                    page = context.new_page()
                    if scenario.get("timeoutMs"):
                        page.set_default_timeout(scenario["timeoutMs"])
                    scenario_started = time.monotonic()
                    trace = CheckTrace()
                    trace.attach(page)
                    page.check_trace = trace
                    steps = StepRecorder()
                    page.step_recorder = steps
                    position = "setup failed before scrolling"
                    try:
                        page.goto((page_directory / scenario["page"]).as_uri())
                        page.wait_for_load_state("networkidle")
                        position = run_scenario(page, scenario, failures, result)
                    except Exception as error:
                        timed_out = isinstance(error, PlaywrightTimeoutError)
                        failures.append(Failure(scenario["page"], f"scenario exception: {error}"))
                    try:
                      if scenario.get('frontmatterLinkState'):
                        trace.run("check_deferred_frontmatter_links_final", lambda: check_deferred_frontmatter_links(page, scenario, failures))
                      result["finalState"] = trace.run("check_final_frame", lambda: check_final_frame(page, scenario, failures))
                    except Exception as error:
                        timed_out = timed_out or isinstance(error, PlaywrightTimeoutError)
                        failures.append(Failure(scenario["page"], f"final frame unavailable: {error}"))
                    if scenario.get("timeoutMs"):
                        duration_ms = round((time.monotonic() - scenario_started) * 1000)
                        short_id = scenario['id'].split('/')[-1].split('-')[0]
                        print(f"{short_id} attempt {attempt} duration {duration_ms} ms ({scenario['id']}, budget {scenario['timeoutMs']} ms)" if attempts_allowed > 1 else f"{short_id} duration {duration_ms} ms ({scenario['id']}, budget {scenario['timeoutMs']} ms)", flush=True)
                        attempt_log.append(duration_ms)
                    if timed_out and attempt < attempts_allowed:
                        print(f"{short_id} attempt {attempt} HUNG after {duration_ms} ms (budget {scenario['timeoutMs']} ms) — retrying once (known hang, see backlog)", flush=True)
                        context.close()
                        continue
                    if timed_out and attempt_log and len(attempt_log) > 1:
                        failures.append(Failure(scenario["page"], f"timed out on every attempt (attempt durations {attempt_log} ms, budget {scenario['timeoutMs']} ms)"))
                    break
                result["checkTrace"] = dict(sorted(trace.counts.items()))
                result["failures"] = [failure.detail for failure in failures[start_failures:]]
                if scenario.get("knownIssue") and result["failures"]:
                    # A scenario that exposes a known product defect reports its failures without gating.
                    result["knownIssue"] = scenario["knownIssue"]
                    result["knownIssueFailures"] = result["failures"]
                    del failures[start_failures:]
                    result["failures"] = []
                result["status"] = "failed" if result["failures"] else "passed"
                target = scenario_png(scenario["id"])
                result["captures"] = []
                if not scenario.get("screenshotOf") and scenario.get("capture") is not False:
                  try:
                    target.parent.mkdir(parents=True, exist_ok=True)
                    page.screenshot(
                      path=str(target),
                      full_page=bool(scenario.get("fullPage")),
                      caret="initial" if scenario.get("editTarget") else "hide",
                    )
                    result["capture"] = relative_to_screenshots(target)
                    result["captures"].append({"file": result["capture"], "step": None})
                  except Exception as error:
                    detail = f"screenshot unavailable: {error}"
                    failures.append(Failure(scenario["page"], detail))
                    result["failures"].append(detail)
                    result["status"] = "failed"
                  target.with_suffix(".json").write_text(
                    sidecar_json(scenario, f"final y={result['finalState'].get('scrollY', 'unknown')}; {position}", result), encoding="utf-8"
                  )
                steps.settle(target if result.get("capture") else None)
                for entry in steps.written:
                  (SCREENSHOT_DIR / entry["file"]).with_suffix(".json").write_text(json.dumps({
                    "summary": f"{scenario['description']} Step: {entry['step']}.",
                    "info": {"id": scenario["id"], "step": entry["step"], "status": result["status"]},
                  }, indent=2) + "\n", encoding="utf-8")
                  result["captures"].append(entry)
                if steps.skipped:
                  result["stepsSkipped"] = steps.skipped
                results.append(result)
                print(f"{result['status']}: {scenario['id']}" + (f" (alias of {scenario['screenshotOf']})" if scenario.get("screenshotOf") else ""), flush=True)
                context.close()
        finally:
            browser.close()
    return results, failures


def main() -> int:
    visual_started_at = datetime.now(timezone.utc).isoformat()
    parser = argparse.ArgumentParser(description="Capture the MyST preview screenshot scenarios.")
    parser.add_argument(
        "--scenario",
        action="append",
        dest="scenario_ids",
        help="Capture only this scenario ID; may be specified more than once.",
    )
    parser.add_argument(
        "--workers", type=int, choices=range(1, 5), default=4,
        help="Number of independent screenshot threads (default: 4).",
    )
    parser.add_argument(
        "--group",
        action="append",
        dest="group_ids",
        help="Capture only the scenarios of this group; may be specified more than once.",
    )
    arguments = parser.parse_args()

    if not MANIFEST.exists():
        print(f"missing {MANIFEST}; run `npm run visual:render` first", file=sys.stderr)
        return 1
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    page_directory = pathlib.Path(manifest["pageDirectory"])
    all_scenarios = manifest["scenarios"]
    groups = {group["id"]: group for group in manifest.get("groups", [])}
    requested_groups = set(arguments.group_ids or [])
    unknown_groups = requested_groups - set(groups)
    if unknown_groups:
        print(f"unknown group ID(s): {', '.join(sorted(unknown_groups))}", file=sys.stderr)
        return 2
    for scenario in all_scenarios:
        invalid = [step for step in scenario.get("steps", []) if step not in STEP_NAMES]
        if invalid or scenario.get("group") not in groups:
            print(f"invalid scenario {scenario['id']}: unknown steps {invalid} or group {scenario.get('group')!r}", file=sys.stderr)
            return 2
    legacy_to_id = {scenario["legacyId"]: scenario["id"] for scenario in all_scenarios if scenario.get("legacyId")}
    # The four exact aliases of P9 B2a no longer run; their old ids select the scenario they mirrored.
    for alias, canonical in REMOVED_ALIAS_CANONICAL.items():
        if canonical in legacy_to_id and alias in (arguments.scenario_ids or []):
            print(f"note: {alias} was an exact alias, no longer a scenario; running {legacy_to_id[canonical]}", file=sys.stderr)
            legacy_to_id[alias] = legacy_to_id[canonical]
    requested_ids = {legacy_to_id.get(identifier, identifier) for identifier in arguments.scenario_ids or []}
    requested_ids |= {scenario["id"] for scenario in all_scenarios if scenario["group"] in requested_groups}
    partial = bool(arguments.scenario_ids or requested_groups)
    known_ids = {scenario["id"] for scenario in all_scenarios}
    unknown_ids = requested_ids - known_ids
    if unknown_ids:
        print(f"unknown scenario ID(s): {', '.join(sorted(unknown_ids))}", file=sys.stderr)
        return 2
    scenarios = [
        scenario for scenario in all_scenarios
        if not requested_ids or scenario["id"] in requested_ids
    ]
    canonical_ids = {scenario["screenshotOf"] for scenario in scenarios if scenario.get("screenshotOf")}
    scenarios = [scenario for scenario in all_scenarios if scenario in scenarios or scenario["id"] in canonical_ids]

    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    if requested_ids:
        for scenario in scenarios:
            for extension in (".png", ".txt", ".json"):
                (VISUAL_SCREENSHOT_DIR / f"{scenario['id']}{extension}").unlink(missing_ok=True)
            for stale in VISUAL_SCREENSHOT_DIR.glob(f"{glob.escape(scenario['id'])}--*"):
                if stale.suffix in {".png", ".json"} and stale.name[len(scenario["id"].split("/")[-1]) + 2:-len(stale.suffix)] in STEP_NAMES:
                    stale.unlink()
    else:
        # The whole visual tree is regenerated; the flat files of the pre-B2a layout are purged too.
        for stale in [*VISUAL_SCREENSHOT_DIR.rglob("*.png"), *VISUAL_SCREENSHOT_DIR.rglob("*.txt"), *VISUAL_SCREENSHOT_DIR.rglob("*.json"),
                      *SCREENSHOT_DIR.glob("*.png"), *SCREENSHOT_DIR.glob("*.txt"), *SCREENSHOT_DIR.glob("*.json")]:
            stale.unlink()
        for report_directory in (FIRST_GAP_REPORT_DIR, WIDTH_BREAK_REPORT_DIR):
            for stale in report_directory.rglob("*.json"):
                stale.unlink()

    failures: list[Failure] = []
    results: list[dict] = []
    worker_count = min(arguments.workers, len(scenarios))
    if worker_count:
        batches = [scenarios[index::worker_count] for index in range(worker_count)]
        with ThreadPoolExecutor(max_workers=worker_count) as executor:
            futures = [executor.submit(capture_scenarios, page_directory, batch) for batch in batches]
            for future in futures:
                batch_results, batch_failures = future.result()
                results.extend(batch_results)
                failures.extend(batch_failures)
    scenario_order = {scenario["id"]: index for index, scenario in enumerate(scenarios)}
    results.sort(key=lambda result: scenario_order[result["id"]])

    # Every PNG of the run is hashed: the scenario PNGs and their step PNGs (H1).
    image_hashes: dict[str, list[str]] = {}
    for result in results:
      for capture in result.get('captures', []):
        digest = hashlib.sha256((SCREENSHOT_DIR / capture['file']).read_bytes()).hexdigest()
        image_hashes.setdefault(digest, []).append(capture['file'])
    duplicate_images = [files for files in image_hashes.values() if len(files) > 1]
    owner_of_file = {capture['file']: result for result in results for capture in result.get('captures', [])}
    for files in duplicate_images:
      detail = f"unintended identical PNGs: {', '.join(files)}"
      failures.append(Failure('campaign', detail))
      for result in {id(owner_of_file[name]): owner_of_file[name] for name in files}.values():
        result['failures'].append(detail)
        result['status'] = 'failed'
    run_manifest = {
      "runId": os.environ.get("STUDIO_E2E_RUN_ID"),
      "campaignStartedAt": os.environ.get("STUDIO_E2E_STARTED_AT"),
      "campaignCommand": os.environ.get("STUDIO_E2E_COMMAND"),
      "startedAt": visual_started_at,
      "revision": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=EXTENSION_ROOT, text=True).strip(),
      "worktreeStatus": subprocess.check_output(["git", "status", "--short"], cwd=EXTENSION_ROOT, text=True).strip(),
      "sourceCommand": sys.orig_argv,
      "renderCommand": manifest.get("sourceCommand"),
      "renderRevision": manifest.get("revision"),
      "renderRunId": manifest.get("runId"),
      "renderCampaignStartedAt": manifest.get("campaignStartedAt"),
      "limitations": manifest.get("limitations"),
      "status": "failed" if failures else "passed",
      "partial": partial,
      "scenarioCount": len(results),
      "pngCount": sum(len(result.get("captures", [])) for result in results),
      "stepPngCount": sum(1 for result in results for capture in result.get("captures", []) if capture["step"]),
      "workerCount": worker_count,
      "screenshotCount": sum(bool(result.get("capture")) for result in results),
      "passedScenarioCount": sum(result['status'] == 'passed' for result in results),
      "failedScenarioCount": sum(result['status'] == 'failed' for result in results),
      "failureCount": len(failures),
      "failures": [{"page": failure.page, "detail": failure.detail} for failure in failures],
      "duplicateImages": duplicate_images,
      "results": results,
      "completedAt": datetime.now(timezone.utc).isoformat(),
    }
    # A partial run (--scenario, --group) must not replace the manifest, the index and the machine
    # report of the full campaign (they would list a subset): it writes `.partial` companions.
    suffix_json = "run-manifest.partial.json" if partial else "run-manifest.json"
    (SCREENSHOT_DIR / suffix_json).write_text(json.dumps(run_manifest, indent=2) + "\n", encoding="utf-8")
    scenario_by_id = {scenario["id"]: scenario for scenario in all_scenarios}
    machine_rows = []
    for result in results:
      for check in result.get("finalState", {}).get("machineChecks") or []:
        if check["applicable"] and not check["pass"]:
          mode = "required" if check["id"] in scenario_by_id[result["id"]].get("machineChecks", []) else "report-only"
          machine_rows.append(f"| {result['id']} | {check['id']} | {mode} | {check['detail'].replace('|', '/')} |")
    machine_report = ["# Machine checks", "",
         "Failing applicable geometry checks per scenario. `required` checks fail the run; "
         "`report-only` checks are recorded and do not.", "",
         f"Scenarios: {len(results)}; failing applicable checks: {len(machine_rows)}.", ""]
    if machine_rows:
      machine_report.extend(["| Scenario | Check | Mode | Detail |", "| --- | --- | --- | --- |", *machine_rows])
    else:
      machine_report.append("No failing applicable checks.")
    (SCREENSHOT_DIR / ("MACHINE-CHECKS.partial.md" if partial else "MACHINE-CHECKS.md")).write_text("\n".join(machine_report) + "\n", encoding="utf-8")
    index = ["# Visual Review", "", f"Run status: **{run_manifest['status']}**", "",
         "Machine checks: [MACHINE-CHECKS.md](MACHINE-CHECKS.md) (failing applicable geometry checks)", "",
         f"Revision: `{run_manifest['revision']}`", "", f"See [run manifest]({suffix_json}) for command, dirty status and assertions.",
         "", str(manifest.get("limitations", "Static generated HTML with mock host.")), ""]
    group = None
    for result in results:
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
    (SCREENSHOT_DIR / ("INDEX.partial.md" if partial else "INDEX.md")).write_text("\n".join(index) + "\n", encoding="utf-8")
    if failures:
        print("\nrendering checks failed:", file=sys.stderr)
        for failure in failures:
            print(f"  {failure.page}: {failure.detail}", file=sys.stderr)
        return 1

    print(f"\n{run_manifest['screenshotCount']} screenshots in {SCREENSHOT_DIR}")
    print(json.dumps({
      "status": "passed",
      "scenario_count": len(scenarios),
      "screenshot_count": run_manifest["screenshotCount"],
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
