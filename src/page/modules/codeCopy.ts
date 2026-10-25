// @implements_req SwRS-MDOKFSTUDIO-CODE-017
/**
 * Copy button over the hovered or keyboard-focused code block. Each code block of the preview is a
 * tab stop; focusing it shows the button, Tab moves to the button and Enter or Space copies.
 */
export function installCodeCopy(
  document: Document,
  window: Window & typeof globalThis,
  post: (text: string, done: (result: { ok?: boolean; reason?: string }) => void) => void,
): { hide(): void; refresh(): void } {
  const contentId = "sphinx-myst-preview-content";
  const size = 26;
  const inset = 6;
  const minimumVisibleHeight = 30;
  const copyIcon = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/>'
    + '<path d="M10.5 3.5v-.5a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 3v5A1.5 1.5 0 0 0 4 9.5h.5"/></svg>';
  const checkIcon = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 4.8"/></svg>';
  // Created on the first hover, so a page nobody points a code block on carries no extra element.
  let button: HTMLButtonElement | undefined;
  let current: Element | undefined;
  let copiedTimer: number | undefined;
  let settleTimer: number | undefined;
  let pointerX = 0;
  let pointerY = 0;

  const refusedIcon = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
  // Counts the clicks: an answer of an older click, or of a block left since, shows nothing.
  let clickSequence = 0;

  const resetCopied = (): void => {
    clickSequence++;
    if (copiedTimer !== undefined) window.clearTimeout(copiedTimer);
    copiedTimer = undefined;
    if (!button) return;
    button.setAttribute("aria-label", "Copy code");
    button.removeAttribute("title");
    button.innerHTML = copyIcon;
  };
  const hide = (): void => {
    current = undefined;
    if (button) button.hidden = true;
    resetCopied();
  };
  const isButton = (node: unknown): boolean =>
    !!button && node instanceof Element && (node === button || button.contains(node));
  const createButton = (): HTMLButtonElement => {
    const created = document.createElement("button");
    created.setAttribute("type", "button");
    created.setAttribute("data-sphinx-preview-code-copy", "");
    created.setAttribute("aria-label", "Copy code");
    created.innerHTML = copyIcon;
    created.hidden = true;
    document.body.appendChild(created);
    created.addEventListener("mousedown", (event) => event.preventDefault());
    created.addEventListener("click", (event) => {
      event.stopPropagation();
      const pre = current;
      if (!pre) return;
      resetCopied();
      const mine = clickSequence;
      // "Copied" only when the host says the clipboard was written; otherwise its reason.
      post(textOf(pre), (result) => {
        if (mine !== clickSequence) return;
        const copied = result.ok === true;
        const label = copied ? "Copied" : (result.reason || "Could not copy.");
        created.setAttribute("aria-label", label);
        if (copied) created.removeAttribute("title");
        else created.setAttribute("title", label);
        created.innerHTML = copied ? checkIcon : refusedIcon;
        copiedTimer = window.setTimeout(resetCopied, copied ? 1500 : 3000);
      });
    });
    return created;
  };
  // @implements_req SwRS-MDOKFSTUDIO-CODE-019
  // Raw code. Wrapped blocks (diff, line numbers, emphasized lines) hold one span per line and no
  // newline characters, so their lines are joined again; the trailing newline matches plain blocks.
  const textOf = (pre: Element): string => {
    const code = pre.querySelector("code");
    if (!code) return pre.textContent ?? "";
    const lines = Array.from(code.children).filter((child) => child.classList.contains("myst-code-line"));
    if (lines.length === 0) return code.textContent ?? "";
    return lines.map((line) => line.textContent ?? "").join("\n") + "\n";
  };
  const blockOf = (node: unknown): Element | undefined => {
    if (!(node instanceof Element)) return undefined;
    const pre = node.closest("pre");
    const content = document.getElementById(contentId);
    if (!pre || !content || !content.contains(pre)) return undefined;
    if (pre.getAttribute("data-sphinx-preview-editing") === "true"
      || pre.closest(".myst-mermaid-figure, .myst-plantuml-figure, [data-sphinx-preview-block-editor]")) {
      return undefined;
    }
    return pre;
  };
  // @implements_req SwRS-MDOKFSTUDIO-CODE-017
  // Makes every copyable block a tab stop; run again after the content is replaced.
  const refresh = (): void => {
    const content = document.getElementById(contentId);
    if (!content) return;
    for (const pre of Array.from(content.querySelectorAll("pre"))) {
      if (blockOf(pre) && !pre.hasAttribute("tabindex")) pre.setAttribute("tabindex", "0");
    }
  };
  const place = (): void => {
    const pre = current;
    if (!pre || !pre.isConnected || pre.getAttribute("data-sphinx-preview-editing") === "true") {
      hide();
      return;
    }
    const control = (button ??= createButton());
    const bounds = pre.getBoundingClientRect();
    let usableTop = Math.max(bounds.top, 0);
    const band = document.querySelector("[data-sphinx-preview-sticky-headings]");
    if (band && !(band as HTMLElement).hidden) {
      const bandBounds = band.getBoundingClientRect();
      if (Number.isFinite(bandBounds.bottom)) usableTop = Math.max(usableTop, bandBounds.bottom);
    }
    const visibleBottom = Math.min(bounds.bottom, window.innerHeight);
    if (visibleBottom - usableTop < minimumVisibleHeight) {
      // Hidden for now; it comes back when the block scrolls into view again.
      control.hidden = true;
      return;
    }
    let top = usableTop + inset;
    let left = Math.min(bounds.right, window.innerWidth) - inset - size;
    const toolbar = document.querySelector("[data-sphinx-preview-toolbar]");
    const controls = toolbar?.getBoundingClientRect();
    if (controls && Number.isFinite(controls.bottom) && controls.width > 0
      && left < controls.right && left + size > controls.left && top < controls.bottom + 4) {
      top = controls.bottom + 4;
    }
    if (top + size > visibleBottom) {
      control.hidden = true;
      return;
    }
    control.style.setProperty("top", `${Math.round(top)}px`);
    control.style.setProperty("left", `${Math.round(Math.max(0, left))}px`);
    control.hidden = false;
  };
  const show = (pre: Element): void => {
    if (current !== pre) resetCopied();
    current = pre;
    place();
  };

  const pointTo = (target: EventTarget | null): void => {
    if (isButton(target)) return;
    const pre = blockOf(target);
    if (!pre) {
      if (current) hide();
    } else if (pre !== current || !button || button.hidden) {
      show(pre);
    }
  };
  document.addEventListener("mouseover", (event) => pointTo(event.target));
  document.addEventListener("mouseout", (event) => {
    const related = event.relatedTarget;
    if (isButton(related)) return;
    if (related instanceof Element && current && current.contains(related)) return;
    hide();
  });
  document.addEventListener("mousemove", (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    pointTo(event.target);
  }, { passive: true });
  // Keyboard path: focusing a block reveals the button, Tab goes on to it, Shift+Tab comes back.
  document.addEventListener("focusin", (event) => {
    if (isButton(event.target)) return;
    const pre = blockOf(event.target);
    if (pre && pre === event.target) show(pre);
  });
  document.addEventListener("focusout", (event) => {
    const related = event.relatedTarget;
    if (isButton(related) || (related instanceof Element && current && current.contains(related))) return;
    if (current && event.target === button && related === current) return;
    hide();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Tab" || event.altKey || event.ctrlKey || event.metaKey) return;
    if (!current || !button || button.hidden) return;
    if (!event.shiftKey && event.target === current) {
      event.preventDefault();
      button.focus();
    } else if (event.shiftKey && isButton(event.target)) {
      event.preventDefault();
      (current as HTMLElement).focus();
    }
  });
  window.addEventListener("scroll", () => {
    if (!current) return;
    place();
    if (settleTimer !== undefined) window.clearTimeout(settleTimer);
    // When scrolling stops, the button stays only if the pointer is still over its block.
    settleTimer = window.setTimeout(() => {
      settleTimer = undefined;
      if (!current) return;
      // Keyboard focus on the block or the button keeps the button, wherever the pointer rests.
      const active = document.activeElement;
      if (active && (active === current || isButton(active))) {
        place();
        return;
      }
      const under = document.elementFromPoint(pointerX, pointerY);
      if (isButton(under)) return;
      const pre = blockOf(under);
      if (pre === current) place();
      else hide();
    }, 120);
  }, { passive: true, capture: true });
  window.addEventListener("resize", () => {
    if (current) place();
  }, { passive: true });

  // A click inside the hovered block may open its editor: the button goes away and comes back
  // with the next pointer move over a block that is not being edited.
  document.addEventListener("click", (event) => {
    if (current && !isButton(event.target) && event.target instanceof Element && current.contains(event.target)) {
      hide();
    }
  });

  refresh();
  return { hide, refresh };
}
