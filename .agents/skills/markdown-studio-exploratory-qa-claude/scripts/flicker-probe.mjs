// Types into the focused source editor while sampling the preview, to measure how often rendered
// content (Mermaid images, KaTeX, total height) disappears between keystrokes.
// Usage: q run flicker-probe.mjs "<text to type>" [prefix]
// Focus the source editor at the insertion point before running.
export default async function ({ page, wv, out, delay, shot, positional }) {
  const text = positional[0] ?? " typing probe";
  const prefix = positional[1] ?? "flicker";
  const samples = [];
  let typing = true;
  let shots = 0;
  const sampler = (async () => {
    while (typing) {
      try {
        const sample = await wv(`({ t: Date.now(),
          mermaidImgs: D.querySelectorAll('.myst-mermaid-image').length,
          mermaidBlocks: D.querySelectorAll('.myst-mermaid-diagram').length,
          katex: D.querySelectorAll('.katex').length,
          height: D.body ? D.body.scrollHeight : 0, y: W.scrollY,
          status: (D.querySelector('[data-sphinx-preview-status]') || {}).textContent || '' })`);
        samples.push(sample);
        if (sample.mermaidBlocks > 0 && sample.mermaidImgs < sample.mermaidBlocks && shots < 3) {
          shots += 1;
          await shot(page, undefined, `${prefix}-gap-${shots}`).catch(() => {});
        }
      } catch {
        samples.push({ t: Date.now(), error: true });
      }
    }
  })();
  const started = Date.now();
  for (const character of text) {
    await page.keyboard.type(character);
    await delay(70);
  }
  await delay(2500);
  typing = false;
  await sampler;
  const ok = samples.filter((s) => !s.error);
  const expected = Math.max(...ok.map((s) => s.mermaidBlocks), 0);
  const gaps = ok.filter((s) => s.mermaidImgs < expected).length;
  const heights = ok.map((s) => s.height);
  const scrolls = ok.map((s) => s.y);
  out({
    typedChars: text.length,
    durationMs: Date.now() - started,
    samples: ok.length,
    errors: samples.length - ok.length,
    mermaidExpected: expected,
    samplesWithMissingMermaid: gaps,
    katexMin: Math.min(...ok.map((s) => s.katex)),
    katexMax: Math.max(...ok.map((s) => s.katex)),
    heightMin: Math.min(...heights),
    heightMax: Math.max(...heights),
    scrollMin: Math.min(...scrolls),
    scrollMax: Math.max(...scrolls),
    statuses: [...new Set(ok.map((s) => s.status))],
    // Share of samples per scrollY / height value: a stable preview has one dominant value.
    scrollHistogram: Object.fromEntries(Object.entries(ok.reduce((acc, s) => ({ ...acc, [s.y]: (acc[s.y] ?? 0) + 1 }), {}))
      .sort((a, b) => b[1] - a[1]).slice(0, 6)),
    heightHistogram: Object.fromEntries(Object.entries(ok.reduce((acc, s) => ({ ...acc, [s.height]: (acc[s.height] ?? 0) + 1 }), {}))
      .sort((a, b) => b[1] - a[1]).slice(0, 6)),
    transitions: ok.reduce((acc, s, i) => acc + (i > 0 && s.y !== ok[i - 1].y ? 1 : 0), 0),
  });
}
