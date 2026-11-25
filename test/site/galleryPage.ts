/**
 * The screenshot gallery page of the site (`gallery.html`): the captures it lists, the stable id and
 * URL fragment of each one, the page body and the inline script of its viewer. The script is written
 * into the page, so the gallery also works opened from disk. `buildSite.ts` owns the document and
 * the gallery styles.
 */
import * as fs from "node:fs";
import * as path from "node:path";

import { E2E_SCREENSHOT_ROOT } from "../reportPaths";
import { RUN_FOLDER_PREFIX } from "../shared/captureRegistry";
import { escapeHtml } from "./socialCard";

/** The images (png, jpg, jpeg, webp) under the screenshot root, in name order. */
export function listCaptures(screenshotRoot = E2E_SCREENSHOT_ROOT): string[] {
  const captures: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(filename);
      else if (entry.isFile() && /\.(png|jpe?g|webp)$/iu.test(entry.name)) captures.push(filename);
    }
  };
  if (fs.existsSync(screenshotRoot)) visit(screenshotRoot);
  return captures;
}

const withoutExtension = (relative: string): string => relative.replace(/\.[^./]+$/u, "");

/**
 * The id of a capture, from its posix path below the screenshot root, without the extension: the
 * scenario id (and step) of a `visual/` capture, the registry id of a real-window capture (its run
 * folder, whose suffix changes on every run, is dropped), else the path itself.
 */
// @implements_req SwRS-MDOKFSTUDIO-CORE-096
export function captureId(relative: string): string {
  const stem = withoutExtension(relative);
  const [first, ...rest] = stem.split("/");
  const dropsFirst = first === "visual" || Object.values(RUN_FOLDER_PREFIX).some((prefix) => first.startsWith(prefix));
  return dropsFirst && rest.length > 0 ? rest.join("/") : stem;
}

/**
 * One unique id per capture, in the order given. The first capture of an id keeps it; a later one
 * takes its full path without the extension, then `~2`, `~3`… while that is taken too.
 */
export function assignCaptureIds(relatives: readonly string[]): string[] {
  const taken = new Set<string>();
  return relatives.map((relative) => {
    let id = captureId(relative);
    if (taken.has(id)) {
      const full = withoutExtension(relative);
      id = full;
      for (let next = 2; taken.has(id); next += 1) id = `${full}~${next}`;
    }
    taken.add(id);
    return id;
  });
}

/** The URL fragment of a capture: each segment of its id percent-encoded, the `/` kept. */
export function captureHref(id: string): string {
  return `#${id.split("/").map(encodeURIComponent).join("/")}`;
}

/** The body of `gallery.html`: one card per capture, the viewer dialog and its script. */
export function buildGallery(screenshotRoot = E2E_SCREENSHOT_ROOT): string {
  const captures = listCaptures(screenshotRoot);
  const relatives = captures.map((filename) => path.relative(screenshotRoot, filename).split(path.sep).join("/"));
  const ids = assignCaptureIds(relatives);
  const cards = captures.map((filename, index) => {
    const relative = relatives[index];
    const id = escapeHtml(ids[index]);
    const stem = filename.replace(/\.[^.]+$/u, "");
    const notePath = [".json", ".md", ".txt"].map((extension) => stem + extension).find((candidate) => fs.existsSync(candidate));
    const raw = notePath ? fs.readFileSync(notePath, "utf8") : "No sidecar metadata was recorded for this capture.";
    const metadata = notePath?.endsWith(".json") ? JSON.parse(raw) as { summary?: string } : undefined;
    const summary = metadata?.summary ?? (notePath ? "Legacy capture: see the full sidecar for expected content and checks." : raw);
    const asset = "reports/e2e/screenshots/" + relative.split("/").map(encodeURIComponent).join("/");
    return `<figure data-capture-id="${id}"><a class="capture-open" href="${escapeHtml(captureHref(ids[index]))}" data-capture-id="${id}" aria-label="Inspect ${escapeHtml(relative)}"><img loading="lazy" src="${escapeHtml(asset)}" alt="${escapeHtml(relative)}"></a><figcaption><h2>${escapeHtml(relative)}</h2><p>${escapeHtml(summary)}</p></figcaption><template class="capture-sidecar">${escapeHtml(raw)}</template></figure>`;
  }).join("\n");
  return `<h1>Screenshot gallery</h1><p>${captures.length} E2E screenshots. Open a capture to inspect the visual evidence and its readable test context.</p><p class="status" role="status" data-capture-missing hidden></p><section class="gallery">${cards}</section>
<dialog class="capture-viewer" aria-labelledby="capture-title"><header><h2 id="capture-title"></h2><nav class="capture-nav" aria-label="Screenshot navigation"><button type="button" data-capture-previous aria-label="Previous screenshot">&larr; Previous</button><span class="capture-position" data-capture-position aria-live="polite"></span><button type="button" data-capture-next aria-label="Next screenshot">Next &rarr;</button></nav><button type="button" class="capture-close" aria-label="Close screenshot" title="Close screenshot">&#215;</button></header><div class="capture-detail"><section class="capture-meta" aria-label="Screenshot details"></section><div class="capture-image"><img alt=""></div></div></dialog>
${galleryScript()}`;
}

/**
 * The viewer's script. The URL fragment says which screenshot is shown: the reader's own moves push
 * a history entry, and `syncFromUrl` shows whatever the URL names (load, Back, Forward, edited
 * address) without ever pushing one.
 */
// @implements_req SwRS-MDOKFSTUDIO-CORE-096
function galleryScript(): string {
  return `<script>
const viewer = document.querySelector('.capture-viewer');
const captureCards = [...document.querySelectorAll('.capture-open')];
const captureIds = captureCards.map(card => card.dataset.captureId);
const missingNotice = document.querySelector('[data-capture-missing]');
const pageTitle = document.title;
const previousButton = viewer.querySelector('[data-capture-previous]');
const nextButton = viewer.querySelector('[data-capture-next]');
const closeButton = viewer.querySelector('.capture-close');
const capturePosition = viewer.querySelector('[data-capture-position]');
const captureMeta = viewer.querySelector('.capture-meta');
let activeIndex = -1;

const appendText = (parent, tag, value, className) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = value == null ? '' : String(value);
  parent.append(element);
  return element;
};
const objectValue = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const displayValue = value => typeof value === 'string' ? value : JSON.stringify(value);
const addFacts = (parent, values) => {
  const facts = document.createElement('dl');
  facts.className = 'capture-facts';
  Object.entries(values).forEach(([label, value]) => {
    if (value == null || value === '') return;
    appendText(facts, 'dt', label);
    appendText(facts, 'dd', displayValue(value));
  });
  if (facts.children.length) parent.append(facts);
};
const addSection = (parent, title) => {
  const section = document.createElement('section');
  section.className = 'capture-section';
  appendText(section, 'h3', title);
  parent.append(section);
  return section;
};
const renderMetadata = raw => {
  captureMeta.replaceChildren();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    appendText(captureMeta, 'p', raw || 'No sidecar metadata was recorded for this capture.', 'capture-summary');
    return;
  }
  const info = objectValue(data.info);
  appendText(captureMeta, 'p', data.summary || 'No summary was recorded for this capture.', 'capture-summary');
  const status = info.status || data.status;
  if (status) {
    const badge = appendText(captureMeta, 'p', status, 'capture-status');
    badge.dataset.status = String(status).toLowerCase();
  }
  const viewport = objectValue(info.viewport);
  addFacts(captureMeta, {
    'Capture ID': info.id || data.id,
    'Fixture': info.fixture || data.fixture,
    'Theme': info.theme || data.theme,
    'Viewport': viewport.width && viewport.height ? String(viewport.width) + ' x ' + String(viewport.height) : undefined,
    'Scroll': info.scroll || data.scroll,
    'Run': info.runId || data.runId,
  });
  const actions = Array.isArray(data.actions) ? data.actions : [];
  if (actions.length) {
    const section = addSection(captureMeta, 'Actions recorded');
    const list = document.createElement('ul');
    list.className = 'capture-actions';
    actions.forEach(action => appendText(list, 'li', action));
    section.append(list);
  }
  const capturedState = objectValue(data.capturedState);
  if (Object.keys(capturedState).length) {
    const section = addSection(captureMeta, 'Captured state');
    addFacts(section, {
      'Edit mode': capturedState.editMode,
      'Preview theme': capturedState.previewTheme,
      'Scroll Y': capturedState.scrollY,
      'Editors': Array.isArray(capturedState.editors) ? capturedState.editors.length : undefined,
      'Visible content': Array.isArray(capturedState.visibleContent) ? capturedState.visibleContent.length : undefined,
    });
  }
  const checks = Array.isArray(data.checks) ? data.checks : [];
  if (checks.length) {
    const section = addSection(captureMeta, 'Machine checks');
    const list = document.createElement('ul');
    list.className = 'capture-checks';
    checks.forEach(check => {
      const item = appendText(list, 'li', (check.pass ? 'PASS ' : 'FAIL ') + (check.id || 'unnamed check') + (check.detail ? ': ' + check.detail : ''), 'capture-check');
      item.dataset.pass = String(Boolean(check.pass));
    });
    section.append(list);
  }
  const technical = document.createElement('details');
  technical.className = 'capture-technical';
  appendText(technical, 'summary', 'Technical sidecar');
  const pre = appendText(technical, 'pre', raw);
  pre.setAttribute('aria-label', 'Complete screenshot sidecar');
  captureMeta.append(technical);
};
const renderCapture = index => {
  activeIndex = Math.max(0, Math.min(index, captureCards.length - 1));
  const figure = captureCards[activeIndex].closest('figure');
  const image = captureCards[activeIndex].querySelector('img');
  viewer.querySelector('h2').textContent = image.alt;
  capturePosition.textContent = String(activeIndex + 1) + ' of ' + String(captureCards.length);
  previousButton.disabled = activeIndex === 0;
  nextButton.disabled = activeIndex === captureCards.length - 1;
  renderMetadata(figure.querySelector('template').content.textContent);
  const targetImage = viewer.querySelector('.capture-image img');
  targetImage.src = image.src;
  targetImage.alt = image.alt;
};
const showCapture = index => {
  renderCapture(index);
  document.title = captureIds[activeIndex] + ' | ' + pageTitle;
  if (!viewer.open) viewer.showModal();
  (activeIndex > 0 ? previousButton : nextButton).focus();
};
const readFragment = () => {
  const fragment = location.hash.slice(1);
  try {
    const id = decodeURIComponent(fragment);
    return { fragment, id, index: captureIds.indexOf(id) };
  } catch {
    return { fragment, id: fragment, index: -1 };
  }
};
// popstate and hashchange both fire for one move, so a second call changes nothing.
const syncFromUrl = () => {
  const { fragment, id, index } = readFragment();
  missingNotice.hidden = !fragment || index >= 0;
  missingNotice.textContent = missingNotice.hidden ? '' : 'The screenshot ' + id + ' is not in this gallery: it may have been renamed or removed.';
  if (index < 0) {
    if (viewer.open) viewer.close();
  } else if (!viewer.open || index !== activeIndex) {
    showCapture(index);
  }
};
const openCapture = index => {
  history.pushState(null, '', captureCards[index].getAttribute('href'));
  syncFromUrl();
};
captureCards.forEach((link, index) => link.addEventListener('click', event => {
  // A middle click or a modified click stays the browser's: new tab, new window, download.
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  openCapture(index);
}));
previousButton.addEventListener('click', () => openCapture(activeIndex - 1));
nextButton.addEventListener('click', () => openCapture(activeIndex + 1));
document.addEventListener('keydown', event => {
  // Alt or Meta with an arrow is the browser's Back and Forward.
  if (!viewer.open || event.altKey || event.metaKey) return;
  if (event.key === 'ArrowLeft' && activeIndex > 0) {
    event.preventDefault();
    openCapture(activeIndex - 1);
  } else if (event.key === 'ArrowRight' && activeIndex < captureCards.length - 1) {
    event.preventDefault();
    openCapture(activeIndex + 1);
  }
});
closeButton.addEventListener('click', () => viewer.close());
viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
viewer.addEventListener('close', () => {
  // The event comes after the close: the viewer may already show another screenshot.
  if (viewer.open) return;
  // The URL still names the screenshot only when the reader closed it, not when the URL did.
  if (readFragment().index === activeIndex) history.pushState(null, '', location.pathname + location.search);
  document.title = pageTitle;
  captureCards[activeIndex].closest('figure').scrollIntoView({ block: 'nearest' });
  captureCards[activeIndex].focus({ preventScroll: true });
});
window.addEventListener('popstate', syncFromUrl);
window.addEventListener('hashchange', syncFromUrl);
syncFromUrl();
</script>`;
}
