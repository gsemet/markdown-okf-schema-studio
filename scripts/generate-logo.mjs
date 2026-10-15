import { copyFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

import { chromium } from "playwright-core";

const logo = fileURLToPath(new URL("../images/logo.svg", import.meta.url));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 256, height: 256 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(logo).href);
  await page.screenshot({
    path: fileURLToPath(new URL("../images/logo.png", import.meta.url)),
    omitBackground: true,
  });
  copyFileSync(logo, new URL("../sphinx/_static/favicon.svg", import.meta.url));
} finally {
  await browser.close();
}
console.log("Generated images/logo.png and sphinx/_static/favicon.svg from images/logo.svg");
