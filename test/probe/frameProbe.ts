/**
 * Page-side instrumentation of the preview performance probe, shared by the windowless probe
 * (Chromium) and the real-window probe (the VS Code webview).
 *
 * `installFrameProbe` runs inside the page (Playwright serialises it, so it must stay
 * self-contained). It wraps `requestAnimationFrame` and `Element.prototype.getBoundingClientRect`:
 * while recording, every animation-frame callback is timed with `performance.now()` (forced style
 * and layout inside the callback are part of that time, as in a DevTools profile) and grouped by
 * frame. It also counts Mermaid diagrams drawn and `message` handler time when it is installed
 * before the runtime (windowless), and keeps the unwrapped `requestAnimationFrame` for the driver.
 */

export interface FrameSample {
  scriptMs: number;
  rectReads: number;
  setStates: number;
  posts: number;
}

export interface FrameStats {
  frames: number;
  meanMs: number;
  p95Ms: number;
  maxMs: number;
  rectReadsPerFrame: number;
  setStatesPerFrame: number;
  postsPerFrame: number;
}

export function installFrameProbe(): void {
  type Sample = { scriptMs: number; rectReads: number; setStates: number; posts: number };
  const scope = window as unknown as Record<string, unknown>;
  if (scope.__studioProbe) return;
  const probe = {
    recording: false,
    frames: new Map<number, Sample>(),
    rectReads: 0,
    setStates: 0,
    posts: 0,
    mermaidDrawn: 0,
    messageMs: 0,
    messages: 0,
    raf: window.requestAnimationFrame.bind(window),
  };
  scope.__studioProbe = probe;
  const raf = probe.raf;
  window.requestAnimationFrame = (callback: FrameRequestCallback): number => raf((time) => {
    if (!probe.recording) {
      callback(time);
      return;
    }
    const rectReads = probe.rectReads;
    const setStates = probe.setStates;
    const posts = probe.posts;
    const started = performance.now();
    try {
      callback(time);
    } finally {
      const sample = probe.frames.get(time) ?? { scriptMs: 0, rectReads: 0, setStates: 0, posts: 0 };
      sample.scriptMs += performance.now() - started;
      sample.rectReads += probe.rectReads - rectReads;
      sample.setStates += probe.setStates - setStates;
      sample.posts += probe.posts - posts;
      probe.frames.set(time, sample);
    }
  });
  const prototype = Element.prototype;
  const rect = prototype.getBoundingClientRect;
  prototype.getBoundingClientRect = function getBoundingClientRect(this: Element): DOMRect {
    probe.rectReads += 1;
    return rect.call(this);
  };
  // Mermaid diagrams drawn (an image element added into a diagram container).
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      record.addedNodes.forEach((node) => {
        if (node instanceof HTMLImageElement && node.classList.contains("myst-mermaid-image")) probe.mermaidDrawn += 1;
      });
    }
  });
  const observe = (): void => observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.documentElement) observe();
  else document.addEventListener("DOMContentLoaded", observe, { once: true });
  // Time spent in `message` handlers registered after this point (the runtime's host messages).
  const addEventListener = window.addEventListener.bind(window);
  window.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: unknown) => {
    if (type !== "message" || typeof listener !== "function") {
      return addEventListener(type, listener, options as AddEventListenerOptions);
    }
    return addEventListener(type, (event: Event) => {
      const started = performance.now();
      try {
        listener(event);
      } finally {
        probe.messageMs += performance.now() - started;
        probe.messages += 1;
      }
    }, options as AddEventListenerOptions);
  }) as typeof window.addEventListener;
}

/** Statistics of the frame samples (the slowest frame and the 95th percentile matter). */
export function frameStats(samples: readonly FrameSample[]): FrameStats {
  const times = samples.map((sample) => sample.scriptMs).sort((first, second) => first - second);
  const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);
  const round = (value: number): number => Math.round(value * 1000) / 1000;
  const count = Math.max(1, samples.length);
  return {
    frames: samples.length,
    meanMs: round(sum(times) / count),
    p95Ms: round(times[Math.min(times.length - 1, Math.floor(times.length * 0.95))] ?? 0),
    maxMs: round(times[times.length - 1] ?? 0),
    rectReadsPerFrame: round(sum(samples.map((sample) => sample.rectReads)) / count),
    setStatesPerFrame: round(sum(samples.map((sample) => sample.setStates)) / count),
    postsPerFrame: round(sum(samples.map((sample) => sample.posts)) / count),
  };
}

/**
 * Remembers the content's top-level blocks (the nodes, their HTML and text) before the typing.
 * Runs inside the page (self-contained).
 */
export function snapshotBlocks(): void {
  const main = document.getElementById("sphinx-myst-preview-content");
  const children = Array.from(main?.children ?? []);
  (window as unknown as { __probeBlocks: unknown }).__probeBlocks = {
    nodes: new WeakSet(children),
    html: children.map((child) => child.outerHTML),
    text: children.map((child) => child.textContent),
  };
}

/**
 * How many top-level blocks the typing replaced, and the first replaced block whose text did not
 * change but whose HTML did (what made the keyed morph miss it), with the text around the change.
 * Runs inside the page (self-contained), after {@link snapshotBlocks}.
 */
export function rebuiltBlocks(): { blocks: number; rebuilt: number; firstDifference?: { index: number; before: string; after: string } } {
  const snapshot = (window as unknown as { __probeBlocks: { nodes: WeakSet<Element>; html: string[]; text: (string | null)[] } }).__probeBlocks;
  const children = Array.from(document.getElementById("sphinx-myst-preview-content")?.children ?? []);
  let firstDifference: { index: number; before: string; after: string } | undefined;
  let rebuilt = 0;
  children.forEach((child, index) => {
    if (snapshot.nodes.has(child)) return;
    rebuilt += 1;
    if (firstDifference || child.querySelector(".myst-mermaid-diagram")) return;
    const was = snapshot.text.indexOf(child.textContent);
    if (was < 0) return;
    const before = snapshot.html[was] ?? "";
    const after = child.outerHTML;
    let at = 0;
    while (at < before.length && before[at] === after[at]) at += 1;
    firstDifference = { index, before: before.slice(Math.max(0, at - 80), at + 120), after: after.slice(Math.max(0, at - 80), at + 120) };
  });
  return { blocks: children.length, rebuilt, ...(firstDifference ? { firstDifference } : {}) };
}
