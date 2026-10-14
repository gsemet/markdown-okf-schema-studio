// Measures source-to-preview latency: types a unique token in the focused source editor and
// reports, per keystroke, how long the preview takes to show the token prefix typed so far.
// Usage: q run latency-probe.mjs [token-length] ; focus the source editor first.
export default async function ({ page, wv, out, delay, positional }) {
  const length = Number(positional[0] ?? 12);
  const token = "Q" + Math.random().toString(36).slice(2, 2 + length - 1).toUpperCase();
  const latencies = [];
  for (let i = 1; i <= token.length; i += 1) {
    const prefix = token.slice(0, i);
    const sent = Date.now();
    await page.keyboard.type(token[i - 1]);
    let seen;
    while (Date.now() - sent < 5000) {
      const found = await wv(`(D.body && D.body.innerText.includes(${JSON.stringify(prefix)}))`).catch(() => false);
      if (found) { seen = Date.now() - sent; break; }
      await delay(5);
    }
    latencies.push(seen ?? 5000);
    await delay(40);
  }
  const sorted = [...latencies].sort((a, b) => a - b);
  out({
    token,
    keystrokes: latencies.length,
    p50: sorted[Math.floor(sorted.length / 2)],
    p90: sorted[Math.floor(sorted.length * 0.9)],
    max: sorted.at(-1),
    latencies,
  });
}
