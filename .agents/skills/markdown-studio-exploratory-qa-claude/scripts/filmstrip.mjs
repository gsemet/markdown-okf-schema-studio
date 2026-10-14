// Types text while taking rapid screenshots of a window region, to show visible jitter/flicker.
// Usage: q run filmstrip.mjs "<text>" <prefix> [x,y,w,h]   (default region: the right editor group)
export default async function ({ page, out, delay, positional, session }) {
  const text = positional[0] ?? " filmstrip";
  const prefix = positional[1] ?? "film";
  const [x, y, width, height] = (positional[2] ?? "895,60,545,810").split(",").map(Number);
  const files = [];
  let frame = 0;
  let typing = true;
  const capture = (async () => {
    while (typing && frame < 60) {
      const name = `${prefix}-${String(frame).padStart(2, "0")}`;
      try {
        const buffer = await page.screenshot({ clip: { x, y, width, height } });
        files.push({ name, at: Date.now(), size: buffer.length });
        const fs = await import("node:fs");
        const path = await import("node:path");
        fs.writeFileSync(path.join(session.shots, `${name}.png`), buffer);
      } catch (error) {
        files.push({ name, error: String(error) });
      }
      frame += 1;
      await delay(40);
    }
  })();
  for (const character of text) {
    await page.keyboard.type(character);
    await delay(80);
  }
  await delay(1500);
  typing = false;
  await capture;
  out({ frames: files.length, first: files[0]?.name, last: files.at(-1)?.name });
}
