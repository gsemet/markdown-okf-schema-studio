export interface LinkPanelDeps {
  /** Starting values; the first empty field takes the focus. */
  text: string;
  url: string;
  /** Enter in a field or the Insert button. */
  onSubmit(text: string, url: string): void;
  /** Escape or the Cancel button. */
  onCancel(): void;
  /**
   * Focus left the panel for something outside the editor frame (`relatedTarget` is `null` for a
   * click on the page or another window). Never called while the panel closes itself.
   */
  onLeave(): void;
  /** Whether a node belongs to the editor frame (the text box, the palette, this panel). */
  isInsideFrame(node: unknown): boolean;
}

export interface LinkPanel {
  element: HTMLElement;
  /** Focuses the first empty field (the Text field when both are filled). */
  focusFirst(): void;
  /** Removes the panel without calling back; later blur events are ignored. */
  destroy(): void;
}

/**
 * The link panel: Text and URL fields with Insert and Cancel, shown under the edition palette.
 * It only collects the two values; the caller applies the edit and restores the text box
 * selection. Tab cycles Text, URL, Insert, Cancel and wraps. Injected into the page script with
 * `.toString()`: the body must not use anything defined outside it.
 */
export function createLinkPanel(document: Document, deps: LinkPanelDeps): LinkPanel {
  let closed = false;
  const root = document.createElement("div");
  root.className = "sphinx-preview-link-panel";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", "Insert link");
  root.setAttribute("data-sphinx-link-panel", "true");
  // A press on the padding or a button must not blur the field that has the focus (that would
  // read as leaving the editor); a press on a field has to focus it.
  root.addEventListener("mousedown", (event: Event) => {
    const target = event.target as { tagName?: string } | null;
    if (String(target?.tagName ?? "").toUpperCase() === "INPUT") return;
    event.preventDefault?.();
  });
  root.addEventListener("click", (event: { stopPropagation?: () => void }) => event.stopPropagation?.());

  function field(name: string, label: string, value: string): HTMLInputElement {
    const row = document.createElement("label");
    row.className = "sphinx-preview-link-panel-row";
    const caption = document.createElement("span");
    caption.textContent = label;
    const input = document.createElement("input");
    input.setAttribute("type", "text");
    input.setAttribute("aria-label", label);
    input.setAttribute("data-link-field", name);
    input.setAttribute("spellcheck", "false");
    input.setAttribute("autocomplete", "off");
    input.value = value;
    row.appendChild(caption);
    row.appendChild(input);
    root.appendChild(row);
    return input;
  }
  function button(name: string, label: string): HTMLButtonElement {
    const control = document.createElement("button");
    control.setAttribute("type", "button");
    control.setAttribute("data-link-action", name);
    control.textContent = label;
    return control;
  }

  const textInput = field("text", "Text", deps.text);
  const urlInput = field("url", "URL", deps.url);
  const actions = document.createElement("div");
  actions.className = "sphinx-preview-link-panel-actions";
  const insertButton = button("insert", "Insert");
  const cancelButton = button("cancel", "Cancel");
  actions.appendChild(insertButton);
  actions.appendChild(cancelButton);
  root.appendChild(actions);

  const stops: HTMLElement[] = [textInput, urlInput, insertButton, cancelButton];
  const submit = (): void => {
    if (closed) return;
    deps.onSubmit(textInput.value, urlInput.value);
  };
  const cancel = (): void => {
    if (closed) return;
    deps.onCancel();
  };

  insertButton.addEventListener("click", (event: { preventDefault?: () => void; stopPropagation?: () => void }) => {
    event.preventDefault?.();
    event.stopPropagation?.();
    submit();
  });
  cancelButton.addEventListener("click", (event: { preventDefault?: () => void; stopPropagation?: () => void }) => {
    event.preventDefault?.();
    event.stopPropagation?.();
    cancel();
  });

  for (const stop of stops) {
    stop.addEventListener("keydown", (event: {
      key?: string;
      shiftKey?: boolean;
      altKey?: boolean;
      metaKey?: boolean;
      ctrlKey?: boolean;
      isComposing?: boolean;
      preventDefault?: () => void;
      stopPropagation?: () => void;
    }) => {
      if (event.isComposing) return;
      // The workbench must not get Cmd/Ctrl+K from a field; it moves to the URL field instead.
      if (
        (event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey)
        && !event.altKey && !event.shiftKey
      ) {
        event.preventDefault?.();
        event.stopPropagation?.();
        urlInput.focus({ preventScroll: true });
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault?.();
        event.stopPropagation?.();
        cancel();
        return;
      }
      if (event.key === "Enter" && (stop === textInput || stop === urlInput)) {
        event.preventDefault?.();
        event.stopPropagation?.();
        submit();
        return;
      }
      if (event.key === "Tab" && !event.altKey && !event.metaKey && !event.ctrlKey) {
        // Tab stays inside the panel; the inner stops use the browser's own order.
        const wrap = event.shiftKey ? stop === stops[0] : stop === stops[stops.length - 1];
        if (!wrap) return;
        event.preventDefault?.();
        event.stopPropagation?.();
        stops[event.shiftKey ? stops.length - 1 : 0].focus({ preventScroll: true });
      }
    });
    stop.addEventListener("blur", (event?: { relatedTarget?: unknown }) => {
      if (closed) return;
      const next = event?.relatedTarget;
      if (next && deps.isInsideFrame(next)) return;
      deps.onLeave();
    });
  }

  return {
    element: root,
    focusFirst() {
      const target = textInput.value === "" ? textInput : urlInput.value === "" ? urlInput : textInput;
      target.focus({ preventScroll: true });
      if (typeof target.select === "function") target.select();
    },
    destroy() {
      closed = true;
      root.remove();
    },
  };
}
