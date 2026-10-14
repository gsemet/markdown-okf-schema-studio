// Plain browser JavaScript, evaluated in the preview page or webview frame by the visual capture
// (test/visual/capture.py) and by the real-input harness (test/integration/realInput/harness.ts).
// It declares exactly one function and reads layout only; it never changes the DOM.
// options.overlays and options.ignoreWithin replace the defaults when they are non-empty; an empty
// or missing array keeps the defaults, so a caller cannot drop a default by passing a short list.
function studioGeometryChecks(options) {
  const opts = options || {};
  const defaultOverlays = [
    '.sphinx-preview-table-menu',
    '.sphinx-preview-frontmatter-menu',
    '.sphinx-preview-link-tooltip',
    '[role="tooltip"]',
  ];
  const defaultIgnoreWithin = [
    '[data-sphinx-preview-block-editor]',
    '[data-okf-frontmatter-editor]',
    '[data-sphinx-preview-table-cell-selected]',
    '[data-okf-editing]',
  ];
  const overlaySelectors = opts.overlays && opts.overlays.length ? opts.overlays : defaultOverlays;
  const ignoreSelectors = opts.ignoreWithin && opts.ignoreWithin.length ? opts.ignoreWithin : defaultIgnoreWithin;
  const textBlockSelector = 'td, th, p, li, h1, h2, h3, h4, h5, h6, pre, dd, dt';
  const identifierPattern = /^\S{1,24}$/u;

  function isVisible(element) {
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function excerpt(text) {
    return text.trim().slice(0, 30);
  }

  function intersectionArea(first, second) {
    const width = Math.min(first.right, second.right) - Math.max(first.left, second.left);
    const height = Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);
    return width > 0 && height > 0 ? width * height : 0;
  }

  function insideSelectors(node, selectors) {
    const parent = node.parentElement;
    if (!parent) return false;
    return selectors.some((selector) => parent.closest(selector) !== null);
  }

  function collectTextNodes(element, out) {
    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType === 3) {
        if (child.textContent.trim()) out.push(child);
      } else if (child.nodeType === 1) {
        collectTextNodes(child, out);
      }
    }
    return out;
  }

  function visibleOverlays() {
    const found = [];
    for (const selector of overlaySelectors) {
      for (const element of Array.from(document.querySelectorAll(selector))) {
        if (isVisible(element) && !found.includes(element)) found.push(element);
      }
    }
    return found;
  }

  const roots = Array.from(document.querySelectorAll('#sphinx-myst-preview-content'));
  const root = roots.length ? roots[0] : undefined;
  const overlays = visibleOverlays();
  const checks = [];

  // overlay-covers-text
  {
    const applicable = overlays.length > 0;
    const covered = [];
    if (applicable && root) {
      const blocks = Array.from(root.querySelectorAll(textBlockSelector));
      // Nested blocks (a p inside a li) reach the same text node, so collect each node once.
      const textNodes = new Set();
      for (const block of blocks) {
        for (const textNode of collectTextNodes(block, [])) textNodes.add(textNode);
      }
      for (const textNode of textNodes) {
        if (insideSelectors(textNode, overlaySelectors) || insideSelectors(textNode, ignoreSelectors)) continue;
        const range = document.createRange();
        range.selectNodeContents(textNode);
        for (const rect of Array.from(range.getClientRects())) {
          if (rect.width <= 0 || rect.height <= 0) continue;
          const hit = overlays.some((overlay) => intersectionArea(rect, overlay.getBoundingClientRect()) > 4);
          if (hit) {
            covered.push(excerpt(textNode.textContent));
            break;
          }
        }
      }
    }
    const pass = covered.length === 0;
    checks.push({
      id: 'overlay-covers-text',
      applicable,
      pass: applicable ? pass : true,
      detail: !applicable
        ? 'no visible overlay'
        : pass ? 'no overlay covers preview text'
          : `${covered.length} covered text excerpt(s): ${covered.slice(0, 5).map((text) => JSON.stringify(text)).join(', ')}`,
    });
  }

  // overlay-clipped
  {
    const applicable = overlays.length > 0;
    const clipped = [];
    for (const overlay of overlays) {
      const rect = overlay.getBoundingClientRect();
      const inside = rect.left >= -1 && rect.top >= -1
        && rect.right <= window.innerWidth + 1 && rect.bottom <= window.innerHeight + 1;
      if (!inside) {
        clipped.push(`${overlay.className || overlay.tagName} at ${Math.round(rect.left)},${Math.round(rect.top)} `
          + `${Math.round(rect.width)}x${Math.round(rect.height)}`);
      }
    }
    const pass = clipped.length === 0;
    checks.push({
      id: 'overlay-clipped',
      applicable,
      pass: applicable ? pass : true,
      detail: !applicable
        ? 'no visible overlay'
        : pass ? 'every overlay is inside the viewport'
          : `clipped: ${clipped.slice(0, 5).join('; ')}`,
    });
  }

  // identifier-split
  {
    const cells = root
      ? Array.from(root.querySelectorAll('td, th')).filter((cell) => identifierPattern.test(cell.textContent.trim()))
      : [];
    const applicable = cells.length > 0;
    const split = [];
    // An identifier is split when one of its own text nodes wraps onto several lines. Text nodes of
    // different sizes on one line, or list items on separate lines, are not a split, so tops are
    // compared only within one text node and never across nodes.
    for (const cell of cells) {
      let wrapped = false;
      for (const textNode of collectTextNodes(cell, [])) {
        const range = document.createRange();
        range.selectNodeContents(textNode);
        const tops = Array.from(range.getClientRects())
          .filter((rect) => rect.width > 0 && rect.height > 0)
          .map((rect) => rect.top);
        if (tops.some((top) => Math.abs(top - tops[0]) > 1)) {
          wrapped = true;
          break;
        }
      }
      if (wrapped) split.push(cell.textContent.trim());
    }
    const pass = split.length === 0;
    checks.push({
      id: 'identifier-split',
      applicable,
      pass: applicable ? pass : true,
      detail: !applicable
        ? 'no identifier cell'
        : pass ? 'identifier cells stay on one line'
          : `${split.length} split identifier(s): ${split.slice(0, 5).join(', ')}`,
    });
  }

  // status-two-lines
  {
    const statuses = Array.from(document.querySelectorAll('[data-sphinx-preview-status]')).filter((status) => {
      const strong = status.querySelector('strong');
      const message = status.querySelector('[data-sphinx-preview-status-message]');
      return strong && message && isVisible(strong) && isVisible(message);
    });
    const applicable = statuses.length > 0;
    const problems = [];
    for (const status of statuses) {
      const strong = status.querySelector('strong').getBoundingClientRect();
      const message = status.querySelector('[data-sphinx-preview-status-message]').getBoundingClientRect();
      if (!(message.top >= strong.bottom - 1)) {
        problems.push(`message top ${Math.round(message.top)} is above strong bottom ${Math.round(strong.bottom)}`);
      }
    }
    const pass = problems.length === 0;
    checks.push({
      id: 'status-two-lines',
      applicable,
      pass: applicable ? pass : true,
      detail: !applicable
        ? 'no status with a strong line and message'
        : pass ? 'status message starts below the strong line' : problems.slice(0, 5).join('; '),
    });
  }

  return { checks };
}
