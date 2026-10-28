"""The `widthModeSwitch` scenario step: switch the Width button to a mode and leave the rest to the scenario's own assertions."""

from __future__ import annotations

from playwright.sync_api import Page

from capture_support import Failure


def apply_width_switch(page: Page, scenario: dict, failures: list[Failure]) -> None:
  """Clicks the Width button until the page is in the scenario's `widthModeSwitch` mode (it must run before the toolbar collapses)."""
  wanted = scenario.get("widthModeSwitch")
  if not wanted:
    return
  button = page.locator("[data-sphinx-preview-width-toggle]")
  for _ in range(3):
    if page.evaluate("document.documentElement.getAttribute('data-sphinx-preview-width')") == wanted:
      break
    button.click()
    page.wait_for_timeout(250)
  if page.evaluate("document.documentElement.getAttribute('data-sphinx-preview-width')") != wanted:
    failures.append(Failure(scenario["page"], f"the Width button did not reach the {wanted} mode"))
