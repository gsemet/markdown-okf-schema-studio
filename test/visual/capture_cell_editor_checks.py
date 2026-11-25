"""Cell editor checks of the table (chrome and End key), split from capture_edit_checks.py."""
from __future__ import annotations

from playwright.sync_api import Page

from capture_support import Failure


# @tests_req SwRS-MDOKFSTUDIO-TABLE-006
def check_cell_editor_chrome(page: Page, page_name: str, target, original_bounds, failures: list[Failure]) -> None:
    """Done/Cancel live inside the cell, the columns keep their width, the toolbar status is centred."""
    info = page.evaluate("""() => {
      const cell = document.querySelector('[data-sphinx-preview-table-cell-selected="true"]');
      const editor = cell && cell.querySelector('[data-sphinx-preview-table-cell-editor]');
      const menu = document.querySelector('[data-sphinx-table-menu]');
      if (!cell || !editor || !menu) return null;
      const cellRect = cell.getBoundingClientRect();
      const buttons = Array.from(editor.querySelectorAll('button')).map(button => {
        const rect = button.getBoundingClientRect();
        return {
          text: button.textContent,
          visible: rect.width > 0 && rect.height > 0 && getComputedStyle(button).visibility !== 'hidden',
          inside: rect.left >= cellRect.left - 1 && rect.right <= cellRect.right + 1
            && rect.top >= cellRect.top - 1 && rect.bottom <= cellRect.bottom + 1,
          top: rect.top,
        };
      });
      const textarea = editor.querySelector('textarea');
      const reference = document.createElement('div');
      reference.className = 'sphinx-preview-block-editor';
      reference.innerHTML = '<textarea></textarea>';
      document.body.appendChild(reference);
      const referenceStyle = getComputedStyle(reference.querySelector('textarea'));
      const cellStyle = getComputedStyle(textarea);
      const font = {
        same: cellStyle.fontFamily === referenceStyle.fontFamily
          && cellStyle.fontSize === referenceStyle.fontSize
          && cellStyle.lineHeight === referenceStyle.lineHeight,
        cell: [cellStyle.fontFamily, cellStyle.fontSize, cellStyle.lineHeight],
        block: [referenceStyle.fontFamily, referenceStyle.fontSize, referenceStyle.lineHeight],
      };
      reference.remove();
      const status = menu.querySelector('[data-sphinx-preview-edit-status]');
      const centre = rect => rect.top + rect.height / 2;
      const operation = menu.querySelector('[data-sphinx-table-operation]');
      const area = textarea.getBoundingClientRect();
      return {
        buttons,
        font,
        cellStatus: editor.querySelectorAll('[data-sphinx-preview-edit-status]').length,
        fieldAboveButtons: buttons.every(button => button.top >= area.bottom - 1),
        // A status that wrapped onto its own line (narrow widths) has no button row to centre on.
        statusDelta: status && operation
          ? (status.getBoundingClientRect().top >= operation.getBoundingClientRect().bottom - 1
            ? 0
            : Math.abs(centre(status.getBoundingClientRect()) - centre(operation.getBoundingClientRect())))
          : null,
        cellWidth: cellRect.width,
        boxWidth: cell.closest('table').clientWidth,
        cellHeight: cellRect.height,
      };
    }""")
    if info is None:
        failures.append(Failure(page_name, "table cell editor, cell or toolbar missing for the chrome checks"))
        return
    if [button["text"] for button in info["buttons"]] != ["Done", "Cancel"]:
        failures.append(Failure(page_name, f"table cell editor buttons are not Done and Cancel: {info['buttons']}"))
    elif not all(button["visible"] and button["inside"] for button in info["buttons"]):
        failures.append(Failure(page_name, f"table cell Done/Cancel are hidden or outside the cell: {info}"))
    if not info["fieldAboveButtons"]:
        failures.append(Failure(page_name, f"table cell buttons are not under the field: {info}"))
    if info["cellStatus"] != 0:
        failures.append(Failure(page_name, "table cell editor still shows the status hint"))
    if not info["font"]["same"]:
        failures.append(Failure(page_name, f"table cell font differs from the block editor: {info['font']}"))
    if info["statusDelta"] is None or info["statusDelta"] > 2:
        failures.append(Failure(page_name, f"toolbar status is not vertically centred with the buttons: {info['statusDelta']}"))
    # The minimum is 300 px, or the room of the table's box (less 2 x 16 px and the collapsed borders) in a narrow pane.
    minimum = min(299, info["boxWidth"] - 36)
    if info["cellWidth"] < minimum:
        failures.append(Failure(page_name, f"edited table cell is narrower than min(300 px, room): {info['cellWidth']}"))
    if original_bounds and original_bounds["width"] < minimum:
        pass  # the edited cell grew to its minimum
    elif original_bounds and abs(info["cellWidth"] - original_bounds["width"]) > 1:
        failures.append(Failure(
            page_name,
            f"table column width changed while editing: {original_bounds['width']} -> {info['cellWidth']}",
        ))
    # A cell that grew to 300 px wraps its text on fewer lines, so it may be shorter.
    grew = original_bounds and info["cellWidth"] > original_bounds["width"] + 1
    if original_bounds and not grew and info["cellHeight"] < original_bounds["height"] - 1:
        failures.append(Failure(page_name, f"table cell shrank while editing: {original_bounds['height']} -> {info['cellHeight']}"))


# @tests_req SwRS-MDOKFSTUDIO-TABLE-123
def check_cell_end_key(page: Page, page_name: str, cell_input, failures: list[Failure]) -> None:
    """Real End key in a focused table-cell editor: caret to the end, default prevented, no scroll.

    On macOS the native End scrolls the preview or shifts a wide table horizontally; headless
    Chromium on Linux moves the caret natively, so the scroll assertions only bite on macOS while
    the defaultPrevented assertion is platform independent.
    """
    cell_input.evaluate("""element => {
      element.focus({ preventScroll: true });
      element.setSelectionRange(0, 0);
      window.__okfEndKey = undefined;
      element.addEventListener("keydown", event => {
        if (event.key === "End") window.__okfEndKey = event.defaultPrevented;
      }, { once: true });
      // Capture-phase listener on window runs first; read defaultPrevented after the editor ran.
      window.addEventListener("keydown", event => {
        if (event.key !== "End") return;
        setTimeout(() => { window.__okfEndPrevented = event.defaultPrevented; }, 0);
      }, { capture: true, once: true });
    }""")
    measure = """() => {
      const cell = document.querySelector('[data-sphinx-preview-table-cell-selected="true"]');
      const lefts = [];
      for (let node = cell.closest('table'); node; node = node.parentElement) lefts.push(node.scrollLeft);
      return { y: window.scrollY, lefts };
    }"""
    before = page.evaluate(measure)
    page.keyboard.press("End")
    page.wait_for_function("() => window.__okfEndPrevented !== undefined", timeout=2000)
    after = page.evaluate(measure)
    prevented = page.evaluate("() => window.__okfEndPrevented")
    caret_at_end = cell_input.evaluate(
      "element => element.selectionStart === element.selectionEnd"
      " && element.selectionEnd === element.value.replace(/[\\r\\n]+$/, '').length"
    )
    if not prevented or not caret_at_end or after != before:
      failures.append(Failure(
        page_name,
        f"End in a table cell did not move the caret to the end without scrolling: "
        f"prevented={prevented} caret_at_end={caret_at_end} {before} -> {after}",
      ))
