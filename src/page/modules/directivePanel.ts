import type { LinkPanel } from "./linkPanel";

/** One text field of the directive form. */
export interface DirectivePanelField {
  name: string;
  label: string;
  value: string;
}

export interface DirectivePanelDeps {
  /** The form's accessible name, for example "Insert card". */
  title: string;
  /** The kind of directive, for the `data-sphinx-directive-panel` attribute. */
  kind: string;
  fields: DirectivePanelField[];
  /** Why the values cannot be written, or `undefined`; the form then stays open and shows it. */
  validate(values: Record<string, string>): string | undefined;
  /** Enter in a field or the Insert button, with valid values. */
  onSubmit(values: Record<string, string>): void;
  /** Escape or the Cancel button. */
  onCancel(): void;
  /** Focus left the panel for something outside the editor frame. Never called while it closes. */
  onLeave(): void;
  /** Whether a node belongs to the editor frame (the text box, the palette, this panel). */
  isInsideFrame(node: unknown): boolean;
}

type KeyEventLike = {
  key?: string;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
  isComposing?: boolean;
  preventDefault?: () => void;
  stopPropagation?: () => void;
};

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-270
// @implements_req SwRS-MDOKFSTUDIO-PALETTE-271
/**
 * The form of a MyST directive (Card, Grid): text fields with Insert and Cancel, shown under the
 * edition palette like the link panel, whose styling and focus handling it shares. It only
 * collects and validates the values; the caller applies the edit. Tab cycles the fields and
 * buttons and wraps.
 */
export function createDirectivePanel(document: Document, deps: DirectivePanelDeps): LinkPanel {
  let closed = false;
  const root = document.createElement("div");
  root.className = "sphinx-preview-link-panel";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", deps.title);
  root.setAttribute("data-sphinx-directive-panel", deps.kind);
  // A press on the padding or a button must not blur the field that has the focus.
  root.addEventListener("mousedown", (event: Event) => {
    const target = event.target as { tagName?: string } | null;
    if (String(target?.tagName ?? "").toUpperCase() === "INPUT") return;
    event.preventDefault?.();
  });
  root.addEventListener("click", (event: { stopPropagation?: () => void }) => event.stopPropagation?.());

  const inputs = deps.fields.map((spec) => {
    const row = document.createElement("label");
    row.className = "sphinx-preview-link-panel-row";
    const caption = document.createElement("span");
    caption.textContent = spec.label;
    const input = document.createElement("input");
    input.setAttribute("type", "text");
    input.setAttribute("aria-label", spec.label);
    input.setAttribute("data-directive-field", spec.name);
    input.setAttribute("spellcheck", "false");
    input.setAttribute("autocomplete", "off");
    input.value = spec.value;
    row.appendChild(caption);
    row.appendChild(input);
    root.appendChild(row);
    return input;
  });
  const status = document.createElement("div");
  status.setAttribute("role", "alert");
  status.setAttribute("data-directive-status", "true");
  const actions = document.createElement("div");
  actions.className = "sphinx-preview-link-panel-actions";
  const button = (name: string, label: string): HTMLButtonElement => {
    const control = document.createElement("button");
    control.setAttribute("type", "button");
    control.setAttribute("data-directive-action", name);
    control.textContent = label;
    actions.appendChild(control);
    return control;
  };
  const insertButton = button("insert", "Insert");
  const cancelButton = button("cancel", "Cancel");
  root.appendChild(actions);
  root.appendChild(status);

  const values = (): Record<string, string> =>
    Object.fromEntries(deps.fields.map((spec, index) => [spec.name, inputs[index].value]));
  const submit = (): void => {
    if (closed) return;
    const collected = values();
    const problem = deps.validate(collected);
    status.textContent = problem ?? "";
    if (problem === undefined) deps.onSubmit(collected);
  };
  const cancel = (): void => {
    if (closed) return;
    deps.onCancel();
  };
  const click = (run: () => void) => (event: { preventDefault?: () => void; stopPropagation?: () => void }): void => {
    event.preventDefault?.();
    event.stopPropagation?.();
    run();
  };
  insertButton.addEventListener("click", click(submit));
  cancelButton.addEventListener("click", click(cancel));

  const stops: HTMLElement[] = [...inputs, insertButton, cancelButton];
  for (const stop of stops) {
    stop.addEventListener("keydown", (event: KeyEventLike) => {
      if (event.isComposing) return;
      if (event.key === "Escape") {
        event.preventDefault?.();
        event.stopPropagation?.();
        cancel();
        return;
      }
      if (event.key === "Enter" && inputs.includes(stop as HTMLInputElement)) {
        event.preventDefault?.();
        event.stopPropagation?.();
        submit();
        return;
      }
      if (event.key === "Tab" && !event.altKey && !event.metaKey && !event.ctrlKey) {
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
      inputs[0].focus({ preventScroll: true });
      if (typeof inputs[0].select === "function") inputs[0].select();
    },
    destroy() {
      closed = true;
      root.remove();
    },
  };
}
