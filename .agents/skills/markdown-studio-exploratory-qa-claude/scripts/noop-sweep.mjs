// No-op round trip over a whole document: for every block, content-table cell, and frontmatter
// field, really click it in edit mode, commit without typing, and require the source buffer to stay
// byte-identical. Prints only a summary and the targets that changed the buffer.
//
// Usage (preview of FILE visible, observer optional):
//   q run noop-sweep.mjs <file-suffix> [blocks|cells|fields|all] [--limit N] [--from N] [--shots]
//     [--commit-blocks Meta+Enter] [--commit-cells Enter] [--commit-fields Escape] [--follow-links]
// --limit N bounds every kind (with or without --from). A link-only block (a paragraph or list item
// whose only content is a link) is clicked beside its link, and listed as "skipped" only when every
// candidate point is on a link (elementFromPoint, e.g. `*Next: [Chapter 7](...)*`). If a click
// navigates anyway (the shown document id changes, checked after the click and at the top of each
// target), the sweep expands the collapsed toolbar, clicks the preview's Back button and waits for
// the original document id; if it never returns, the WHOLE sweep stops with an error (exit non-zero,
// report marked "aborted").
// The document is a QA copy: a changed target leaves its change in the buffer, and the next
// targets are compared with that new text.
import fs from "node:fs";
import path from "node:path";

// Pure helpers, exported so they can be checked without VS Code.
export function selectTargets(targets, { from = 0, limit = 500 } = {}) {
  return targets.slice(from, from + limit);
}
// In-page click-point search, shared text: candidate points of a block, first one not on a link.
const PICK_POINT = `(el) => { const r = el.getBoundingClientRect();
  const xs = [Math.min(40, r.width / 2), 4, r.width / 2, r.width - 4, r.width * 0.75];
  const ys = [Math.min(10, r.height / 2), r.height / 2, Math.max(2, r.height - 4)];
  for (const dy of ys) for (const dx of xs) {
    const px = r.left + dx, py = r.top + dy;
    const hit = D.elementFromPoint(px, py);
    if (hit && el.contains(hit) && !hit.closest('a[href]')) return { x: Math.round(BASE.x + r.left + dx), y: Math.round(BASE.y + r.top + dy) };
  }
  return null; }`;

const TARGETS = {
  blocks: `Array.from(D.querySelectorAll('[data-sphinx-source-line]'))
    .filter((el) => !el.closest('[data-okf-properties], table, [data-sphinx-preview-toolbar], [data-sphinx-preview-sticky-headings]'))
    .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
    .map((el) => ({ key: 'L' + el.getAttribute('data-sphinx-source-line'), tag: el.tagName }))
    .filter((t, i, all) => all.findIndex((o) => o.key === t.key) === i)`,
  cells: `Array.from(D.querySelectorAll('table')).filter((t) => !t.closest('[data-okf-properties]'))
    .flatMap((table, ti) => Array.from(table.rows).flatMap((row, ri) => Array.from(row.cells).map((cell, ci) => ({ key: ti + ':' + ri + ':' + ci, tag: cell.tagName }))))`,
  fields: `Array.from(D.querySelectorAll('tr[data-okf-field][data-okf-editable="true"]'))
    // One click toggles a checkbox field by design: it is not a no-op target.
    .filter((row) => !/boolean|checkbox/.test(row.getAttribute('data-okf-type') || '') && !row.querySelector('input[type=checkbox]'))
    .map((row) => ({ key: row.getAttribute('data-okf-field'), tag: row.getAttribute('data-okf-type') || 'field' }))`,
};

const LOCATE = {
  blocks: (key) => `D.querySelector('[data-sphinx-source-line="${key.slice(1)}"]')`,
  cells: (key) => { const [t, r, c] = key.split(":").map(Number);
    return `(Array.from(D.querySelectorAll('table')).filter((t) => !t.closest('[data-okf-properties]'))[${t}]?.rows[${r}]?.cells[${c}] ?? null)`; },
  fields: (key) => `D.querySelector('tr[data-okf-field=${JSON.stringify(key)}] [data-okf-edit-cell="value"]')`,
};

const DOC_ID = `(D.documentElement.getAttribute('data-sphinx-preview-document-id') || D.querySelector('[data-sphinx-source-line]')?.getAttribute('data-sphinx-preview-document') || '')`;
const EDITOR_OPEN = `!!D.querySelector('[data-sphinx-preview-block-editor], [data-sphinx-preview-table-cell-editor], [data-okf-frontmatter-editor]')`;

export default async function ({ page, wv, out, delay, shot, session, positional, options, readSpy, freshSpy, lineDiff, setEditMode, ctx }) {
  const suffix = positional[0];
  if (!suffix) throw new Error("usage: q run noop-sweep.mjs <file-suffix> [blocks|cells|fields|all]");
  const kinds = !positional[1] || positional[1] === "all" ? ["blocks", "cells", "fields"] : positional[1].split(",");
  const commit = {
    blocks: options["commit-blocks"] ?? "Meta+Enter",
    cells: options["commit-cells"] ?? "Enter",
    fields: options["commit-fields"] ?? "Escape",
  };
  const limit = Number(options.limit ?? 500);
  const followLinks = Boolean(options["follow-links"]);
  const from = Number(options.from ?? 0);
  const buffer = async () => {
    const doc = (await freshSpy(readSpy, session))?.documents?.find((d) => d.fsPath.endsWith(suffix));
    if (!doc) throw new Error(`no open document ends with ${suffix}`);
    return doc.text;
  };
  const settle = async () => {
    // No editor open and the layout stops moving.
    let last = "";
    for (let i = 0; i < 20; i += 1) {
      const sig = await wv(`(${EDITOR_OPEN}) + ':' + W.scrollY + ':' + D.body.scrollHeight + ':' + ((D.querySelector('[data-sphinx-preview-status]') || {}).textContent || '')`).catch(() => "");
      if (sig && sig === last && sig.startsWith("false:")) return true;
      last = sig;
      await delay(250);
    }
    return false;
  };

  await setEditMode(ctx, true);
  let baseline = await buffer();
  const docId = await wv(DOC_ID);
  const report = { file: suffix, at: new Date().toISOString(), kinds: {} };
  let aborted = null;
  const abort = (kind, key) => {
    aborted = `Back did not return to ${docId} (${kind} ${key}); sweep stopped, later kinds not run`;
    report.aborted = aborted;
  };
  // Back lives in the toolbar's collapsed rows: expand them, wait for an enabled button, click it.
  const goBack = async () => {
    const click = async (sel) => {
      const b = await wv(`box(D.querySelector(${JSON.stringify(sel)}))`).catch(() => null);
      if (!b || !(b.w > 0) || !(b.h > 0)) return false;
      await page.mouse.click(b.x + b.w / 2, b.y + b.h / 2);
      return true;
    };
    if (await wv(`!!D.querySelector('[data-sphinx-preview-toolbar-collapse][aria-expanded="false"]')`).catch(() => false)) {
      await click("[data-sphinx-preview-toolbar-collapse]");
      await delay(600);
    }
    let ready = false;
    for (let i = 0; i < 12 && !ready; i += 1) {
      ready = await wv(`(() => { const b = D.querySelector('[data-sphinx-preview-back]'); if (!b || b.disabled) return false; const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; })()`).catch(() => false);
      if (!ready) await delay(250);
    }
    if (!ready || !(await click("[data-sphinx-preview-back]"))) return false;
    let ok = false;
    for (let i = 0; i < 20 && !ok; i += 1) { await delay(250); ok = (await wv(DOC_ID).catch(() => "")) === docId; }
    if (ok) await setEditMode(ctx, true);
    return ok;
  };
  for (const kind of kinds) {
    if (aborted) break;
    const targets = selectTargets(await wv(TARGETS[kind]), { from, limit });
    const stats = { tried: 0, opened: 0, changed: [], notEditable: [], errors: [], skipped: [] };
    report.kinds[kind] = stats;
    for (const target of targets) {
      stats.tried += 1;
      try {
        await page.keyboard.press("Escape");
        await settle();
        // A navigation slower than the post-click check shows up here.
        if ((await wv(DOC_ID).catch(() => "")) !== docId) {
          stats.errors.push(`${target.key}: document changed before the click; going back`);
          if (!(await goBack())) { abort(kind, target.key); break; }
        }
        const found = await wv(`(() => { const el = ${LOCATE[kind](target.key)}; if (!el) return false; el.scrollIntoView({ block: 'center' }); return true; })()`);
        if (!found) {
          // A block whose source line vanished without a buffer change means the mapping moved.
          const near = kind === "blocks" ? await wv(`Array.from(D.querySelectorAll('[data-sphinx-source-line]')).map((el) => +el.getAttribute('data-sphinx-source-line'))
            .filter((l, i, all) => Math.abs(l - ${Number(target.key.slice(1)) || 0}) <= 4 && all.indexOf(l) === i).sort((a, b) => a - b)`) : [];
          stats.errors.push(`${target.key}: not found after re-render${near.length ? ` (mapped lines nearby now: ${near.join(", ")}; the buffer did not change, so the mapping moved)` : ""}`);
          continue;
        }
        await delay(250);
        const b = await wv(`box(${LOCATE[kind](target.key)})`);
        let px = b.x + Math.min(40, b.w / 2), py = b.y + Math.min(10, b.h / 2);
        if (kind === "blocks" && !followLinks) {
          // Click only where no link sits under the pointer (elementFromPoint in the page).
          const pt = await wv(`(${PICK_POINT})(${LOCATE[kind](target.key)})`);
          if (!pt) { stats.skipped.push(target.key); stats.tried -= 1; continue; }
          px = pt.x; py = pt.y;
        }
        await page.mouse.click(px, py);
        await delay(500);
        // A click that navigated to another document (link, anchor) must not derail the sweep.
        const nowDoc = await wv(DOC_ID).catch(() => "");
        if (nowDoc !== docId) {
          stats.errors.push(`${target.key}: click navigated away (${nowDoc || "no document"}); going back`);
          if (!(await goBack())) { abort(kind, target.key); break; }
          continue;
        }
        let opened = false;
        for (let i = 0; i < 12 && !opened; i += 1) { await delay(100); opened = await wv(EDITOR_OPEN).catch(() => false); }
        if (opened) {
          stats.opened += 1;
          await page.keyboard.press(commit[kind]);
          await delay(700);
        } else stats.notEditable.push(target.key);
        await settle();
        // Compare after every click, editor or not: a click alone must not change the source either.
        const now = await buffer();
        if (now !== baseline) {
          const d = lineDiff(baseline, now, { maxLines: 8, width: 120 });
          const entry = { key: target.key, tag: target.tag, removed: d.removed, added: d.added, firstLine: d.firstLine, diff: d.text };
          if (options.shots) entry.shot = await shot(page, session, `noop-${kind}-${target.key.replace(/\W+/g, "_")}`, { clip: "preview" }).catch(() => undefined);
          stats.changed.push(entry);
          baseline = now;
        }
      } catch (error) {
        stats.errors.push(`${target.key}: ${String(error?.message ?? error).split("\n")[0]}`);
      }
    }
    out(`${kind}: ${stats.tried} tried, ${stats.opened} opened, ${stats.changed.length} CHANGED, ${stats.notEditable.length} not editable, ${stats.errors.length} error(s), ${stats.skipped.length} link-only skipped`);
    for (const c of stats.changed) out(`  CHANGED ${kind} ${c.key} <${c.tag}>: -${c.removed} +${c.added} at L${c.firstLine}${c.shot ? ` ${path.basename(c.shot)}` : ""}\n${c.diff.split("\n").map((line) => `     ${line}`).join("\n")}`);
    for (const e of stats.errors.slice(0, 5)) out(`  error ${e}`);
  }
  await page.keyboard.press("Escape");
  const dir = path.join(session.dir, "sweeps");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `noop-${suffix.replace(/\W+/g, "_")}-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 1));
  out(`details: ${file}`);
  if (aborted) {
    out(`SWEEP ABORTED: ${aborted}`);
    throw new Error(`noop-sweep aborted: ${aborted}`);
  }
}
