// For each selector: bring the element into view, wait for a stable layout, really click it,
// and report what the inline editor opened (raw source, caret, edited range), then Escape.
export default async function ({ page, wv, out, delay, shot, session, positional }) {
  const selectors = JSON.parse(positional[0]);
  const prefix = positional[1] ?? "blk";
  const results = [];
  const stable = async () => {
    let last = "";
    for (let i = 0; i < 20; i++) {
      const sig = await wv(`D.querySelectorAll('[data-sphinx-preview-block-editor]').length + ':' + W.scrollY + ':' + D.body.scrollHeight + ':' + (D.querySelector('[data-sphinx-preview-status]')||{}).textContent`);
      if (sig === last && sig.startsWith("0:")) return sig;
      last = sig;
      await delay(300);
    }
    return "unstable:" + last;
  };
  for (const [index, selector] of selectors.entries()) {
    await page.keyboard.press("Escape");
    await delay(400);
    await stable();
    const target = await wv(`(() => { const el = D.querySelector(${JSON.stringify(selector)}); if (!el) return null; el.scrollIntoView({block: 'center'}); return true; })()`);
    if (!target) { results.push({ selector, missing: true }); continue; }
    const sig = await stable();
    const before = await wv(`(() => { const el = D.querySelector(${JSON.stringify(selector)}); const b = box(el);
      const px = Math.min(40, b.w / 2), py = Math.min(10, b.h / 2);
      const hit = D.elementFromPoint(el.getBoundingClientRect().x + px, el.getBoundingClientRect().y + py);
      const mapped = hit && hit.closest('[data-sphinx-source-line]');
      return { ...b, px, py, tag: el.tagName, line: el.getAttribute('data-sphinx-source-line'), hit: hit && hit.tagName + '.' + (hit.className||''), hitLine: mapped && mapped.getAttribute('data-sphinx-source-line'), sy: W.scrollY }; })()`);
    await page.mouse.click(before.x + before.px, before.y + before.py);
    await delay(1200);
    const after = await wv(`(() => { const a = D.activeElement; const ed = D.querySelector('[data-sphinx-preview-block-editor]');
      const editing = D.querySelector('[data-sphinx-preview-editing="true"], [data-sphinx-preview-table-cell-selected="true"]');
      return { active: a && a.tagName, label: a && a.getAttribute('aria-label'), value: a && typeof a.value === 'string' ? a.value.slice(0, 300) : null,
        caret: a && a.selectionStart, editingLine: editing && editing.getAttribute('data-sphinx-source-line'), status: ed && (ed.querySelector('[data-sphinx-preview-edit-status]') || {}).textContent, y: W.scrollY }; })()`);
    const file = await shot(page, session, `${prefix}-${index}`);
    results.push({ selector, sig, before, after, file: file.split("/").pop() });
  }
  await page.keyboard.press("Escape");
  out(results);
}
