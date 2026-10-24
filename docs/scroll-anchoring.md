# Scroll Anchoring Policy

The preview and the text editor share one scroll anchor: a **source line**. One module implements
the policy, [`src/webview/anchorPolicy.ts`](../src/webview/anchorPolicy.ts). The webview runtime
imports it through the page bundle, and the extension host imports the same file.
Every editing mode goes through it, so a change to the rules is made in one place.

## Rules

**R1. The anchor is the start of a source line, never the cursor.** The anchor is a fractional
source line (`12.4` is 40 % of the way from the start of line 12 to the start of line 13). The
editor reports its first visible line. The preview reports the line under its reading line. The
caret position never moves either pane.

**R2. One reading line per pane.** In the preview, the anchor sits on a reading line at `R` pixels
below the viewport top, where `R = max(depth × lineHeight + 5, sticky band height)`. `depth` is
the sticky heading depth. `R` is 0 when the sticky band is disabled. Near the top of the page, the
reading line ramps from 0 to `R` (`readingY = scrollTop < R ? 2 × scrollTop : scrollTop + R`), so
`scrollTop = 0` always means line 1, and every line stays reachable. In the editor, the anchor is
the first visible line.

**R3. Long paragraphs are mapped line by line.** The anchor map is a monotonic list of
`(y, line)` points built from every mapped block: its top, its bottom (`endLine + 1`), and, for a
paragraph, the rendered top of each soft source line (`lineTops`). A source line inside a long
paragraph therefore maps to its rendered position, not to a proportional guess across the block.
When the lines cannot be measured reliably, the map falls back to the block bounds.

**R4. The pane that the user moved owns the anchor.** A user scroll in the editor makes the
editor the owner. A user scroll in the preview, a link, or an inline edit makes the preview the
owner. The owner never receives a scroll back from the other pane.

**R5. Programmatic scrolls are silent.** The webview records each scroll that it performs and
ignores the matching `scroll` event. The host records each editor reveal in an `EditorEchoGuard`
keyed by document, not by render request, so echoes stay suppressed across re-renders. The guard
accepts editor tops between the start and target lines. It accepts a single centered-reveal
event, then treats further movement as the user's.

**R6. The anchor persists across renders and layout changes.** The host keeps the last anchor per
document and passes it to each new render (`initialAnchor`). The webview applies it before the
first paint. There is no `previewReady` round trip. Image loads, `ResizeObserver`, window and
visual-viewport resizes, and the sticky band reapply the stored anchor. They never re-derive it
from the shifted `scrollTop`.
A panel that only changes focus (active <-> inactive) keeps its anchor; only a hidden panel that
becomes visible catches up with the editor.

**R7. Inline edits keep the edited element fixed.** While a block or frontmatter editor is open,
the anchor is the edited element's viewport top. Re-renders after Save keep that element at the
same screen position, then the anchor returns to a source line.
A final save sends the edited element's source line and viewport top (`pinLine`, `pinViewportTop`);
the host hands them to the next render as `initialPin`, and `restoreState` scrolls so that block's top
lands at that viewport position before the anchor returns to a source line.
The pin waits for the render of the saved document version (an earlier autosave build does not use
it up), and that render reports the pinned anchor in `previewReady`, so a later render keeps the position.
An explicit source-editor scroll still leads when anchoring is enabled;
the edited element's viewport anchor updates to the new position without closing the edit.

**R8. The sticky heading band never moves content.** The band is `position: fixed` and
`overflow-anchor` is disabled on `html` and `body`. Showing, hiding, or resizing the band only
changes `R`.

**R9. Text edits shift the anchor.** Lines inserted or removed above the anchor shift it
(`shiftLineForEdits`). An edit at or below the anchor line leaves it unchanged.

## Behavior per Editing Mode

| Mode | Owner while typing | What stays still |
|------|--------------------|------------------|
| Text editor with the side preview, anchoring on | Editor | The editor's first visible line is drawn on the preview's reading line after every render. |
| Text editor with the side preview, anchoring off | Preview | The preview keeps its own source line across renders. Edits above it shift that line. |
| Scrolling the preview (`scrollEditorWithPreview`) | Preview | The editor reveals the preview's line. The echo guard suppresses the resulting editor event. |
| Custom editor (Open With) | Preview | Same as anchoring off: one pane, one source line anchor. |
| Inline edit in the preview (block or frontmatter) | Preview, element mode | The edited element keeps its viewport top while you type and after Save. |

With anchoring on, a user scroll in the preview moves the editor only when
`scrollEditorWithPreview` is enabled. Otherwise the preview stays where the user put it until the
editor scrolls again.
The anchor button disables both scroll directions without changing the reverse-scroll preference.
With no source editor open, scrolling the preview does not create one.

## Tests

- [`test/webview/anchorPolicy.test.ts`](../test/webview/anchorPolicy.test.ts) covers the map,
  long paragraphs, the round trip between lines and scroll positions, the top ramp, the echo
  guard, and anchor shifts.
- [`test/page/runtime.test.ts`](../test/page/runtime.test.ts) runs the webview runtime
  through source scrolls, layout changes, sticky band activation, anchor navigation,
  and returning to a previously reported line after the source editor takes control.
- [`test/integration/scroll-sync-suite.ts`](../test/integration/scroll-sync-suite.ts) drives a real
  VS Code window through 12 scenarios using a document with more than 4,000 source lines.
  It covers standalone and paired editors, reading and edit modes, active block edits,
  both anchor states, repeated endpoint jumps, and scroll-owner handoffs.
  Run `npm run test:e2e` from the extension directory; `test:integration` also includes this suite.
  Screenshots are written to `out/reports/e2e/screenshots/scroll-e2e-*/`.
