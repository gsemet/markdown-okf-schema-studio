import type { FigureValues } from "./figureDirective";

export interface FigurePanelDeps {
  /** Starting values. */
  values: FigureValues;
  /** "image": a Markdown image about to become a figure (the submit button says so). */
  mode: "figure" | "image";
  /** Field name to message; an empty object lets the values through. */
  validate(values: FigureValues): Record<string, string>;
  /** Opens the host's file dialog; `done` gets the relative path, or `undefined` when none. */
  browse(done: (path: string | undefined) => void): void;
  onSubmit(values: FigureValues): void;
  /** Escape or the Cancel button. */
  onCancel(): void;
  /** Focus left the panel for something outside the editor frame. */
  onLeave(): void;
  isInsideFrame(node: unknown): boolean;
}

export interface FigurePanel {
  element: HTMLElement;
  focusFirst(): void;
  /** Focuses the caption field with its text selected (a figure that was just inserted). */
  focusCaption(): void;
  /** Removes the panel without calling back; later blur events are ignored. */
  destroy(): void;
}

type KeyEventLike = {
  key?: string;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
  isComposing?: boolean;
  target?: unknown;
  preventDefault?: () => void;
  stopPropagation?: () => void;
};

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-031
// @implements_req SwRS-MDOKFSTUDIO-PALETTE-036
/**
 * The figure form: Source (with Browse), Alt text, Caption, Legend, Width, Align and Name, shown
 * under the edition palette. It only collects the values; the caller writes the directive.
 * Enter in a one-line field and Cmd/Ctrl+Enter anywhere apply; Escape cancels; Tab cycles inside
 * the panel. An invalid value shows its message under the field and keeps the panel open.
 */
export function createFigurePanel(document: Document, deps: FigurePanelDeps): FigurePanel {
  let closed = false;
  const root = document.createElement("div");
  root.className = "sphinx-preview-figure-panel";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", deps.mode === "image" ? "Convert image to figure" : "Edit figure");
  root.setAttribute("data-sphinx-figure-panel", "true");
  root.addEventListener("mousedown", (event: Event) => {
    const tag = String((event.target as { tagName?: string } | null)?.tagName ?? "").toUpperCase();
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    event.preventDefault?.();
  });
  root.addEventListener("click", (event: { stopPropagation?: () => void }) => event.stopPropagation?.());

  const title = document.createElement("div");
  title.className = "sphinx-preview-figure-panel-title";
  title.textContent = deps.mode === "image" ? "Image" : "Figure";
  root.appendChild(title);

  const errors = new Map<string, HTMLElement>();
  const stops: HTMLElement[] = [];

  function row(name: string, label: string, control: HTMLElement, extra?: HTMLElement): void {
    const wrapper = document.createElement("label");
    wrapper.className = "sphinx-preview-figure-panel-row";
    wrapper.setAttribute("data-figure-row", name);
    const caption = document.createElement("span");
    caption.textContent = label;
    wrapper.appendChild(caption);
    const line = document.createElement("div");
    line.className = "sphinx-preview-figure-panel-control";
    line.appendChild(control);
    if (extra) line.appendChild(extra);
    wrapper.appendChild(line);
    const problem = document.createElement("div");
    problem.className = "sphinx-preview-figure-panel-error";
    problem.setAttribute("role", "alert");
    problem.setAttribute("data-figure-error", name);
    problem.hidden = true;
    errors.set(name, problem);
    wrapper.appendChild(problem);
    root.appendChild(wrapper);
  }
  function input(name: string, label: string, value: string): HTMLInputElement {
    const control = document.createElement("input");
    control.setAttribute("type", "text");
    control.setAttribute("aria-label", label);
    control.setAttribute("data-figure-field", name);
    control.setAttribute("spellcheck", "false");
    control.setAttribute("autocomplete", "off");
    control.value = value;
    return control;
  }
  function area(name: string, label: string, value: string, rows: number): HTMLTextAreaElement {
    const control = document.createElement("textarea");
    control.setAttribute("aria-label", label);
    control.setAttribute("data-figure-field", name);
    control.setAttribute("rows", String(rows));
    control.setAttribute("spellcheck", "false");
    control.value = value;
    return control;
  }
  function button(name: string, label: string): HTMLButtonElement {
    const control = document.createElement("button");
    control.setAttribute("type", "button");
    control.setAttribute("data-figure-action", name);
    control.textContent = label;
    return control;
  }

  const source = input("source", "Source", deps.values.source);
  const browse = button("browse", "Browse...");
  const alt = input("alt", "Alt text", deps.values.alt);
  const caption = area("caption", "Caption", deps.values.caption, 2);
  const legend = area("legend", "Legend", deps.values.legend, 3);
  const width = input("width", "Width", deps.values.width);
  width.setAttribute("placeholder", "60% or 300px");
  const align = document.createElement("select");
  align.setAttribute("aria-label", "Align");
  align.setAttribute("data-figure-field", "align");
  for (const [value, label] of [["", "None"], ["left", "Left"], ["center", "Center"], ["right", "Right"]]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    align.appendChild(option);
  }
  align.value = deps.values.align;
  const name = input("name", "Name", deps.values.name);

  row("source", "Source", source, browse);
  row("alt", "Alt text", alt);
  row("caption", "Caption", caption);
  row("legend", "Legend", legend);
  row("width", "Width", width);
  row("align", "Align", align);
  row("name", "Name", name);

  const actions = document.createElement("div");
  actions.className = "sphinx-preview-figure-panel-actions";
  const apply = button("apply", deps.mode === "image" ? "Convert to figure" : "Apply");
  const cancel = button("cancel", "Cancel");
  actions.appendChild(apply);
  actions.appendChild(cancel);
  root.appendChild(actions);

  stops.push(source, browse, alt, caption, legend, width, align, name, apply, cancel);

  const read = (): FigureValues => ({
    source: source.value, alt: alt.value, caption: caption.value, legend: legend.value,
    width: width.value, align: align.value, name: name.value,
  });
  const submit = (): void => {
    if (closed) return;
    const values = read();
    const problems = deps.validate(values);
    let firstProblem: HTMLElement | undefined;
    for (const [field, element] of errors) {
      const message = problems[field];
      element.textContent = message ?? "";
      element.hidden = message === undefined;
      const control = stops.find((stop) => stop.getAttribute("data-figure-field") === field);
      if (message !== undefined) {
        control?.setAttribute("aria-invalid", "true");
        firstProblem = firstProblem ?? control;
      } else {
        control?.removeAttribute("aria-invalid");
      }
    }
    if (firstProblem) {
      firstProblem.focus({ preventScroll: true });
      return;
    }
    deps.onSubmit(values);
  };
  const leave = (): void => {
    if (closed) return;
    deps.onCancel();
  };

  apply.addEventListener("click", (event: { preventDefault?: () => void; stopPropagation?: () => void }) => {
    event.preventDefault?.();
    event.stopPropagation?.();
    submit();
  });
  cancel.addEventListener("click", (event: { preventDefault?: () => void; stopPropagation?: () => void }) => {
    event.preventDefault?.();
    event.stopPropagation?.();
    leave();
  });
  browse.addEventListener("click", (event: { preventDefault?: () => void; stopPropagation?: () => void }) => {
    event.preventDefault?.();
    event.stopPropagation?.();
    deps.browse((path) => {
      if (closed) return;
      if (path !== undefined) source.value = path;
      source.focus({ preventScroll: true });
    });
  });

  for (const stop of stops) {
    stop.addEventListener("keydown", (event: KeyEventLike) => {
      if (event.isComposing) return;
      if (event.key === "Escape") {
        event.preventDefault?.();
        event.stopPropagation?.();
        leave();
        return;
      }
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !event.altKey) {
        event.preventDefault?.();
        event.stopPropagation?.();
        submit();
        return;
      }
      const multiLine = stop === caption || stop === legend;
      const pushButton = stop === browse || stop === apply || stop === cancel;
      if (event.key === "Enter" && !multiLine && !pushButton && !event.shiftKey && !event.altKey) {
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
      const target = deps.mode === "image" ? apply : source;
      target.focus({ preventScroll: true });
      if (target === source && typeof source.select === "function") source.select();
    },
    focusCaption() {
      caption.focus({ preventScroll: true });
      if (typeof caption.select === "function") caption.select();
    },
    destroy() {
      closed = true;
      root.remove();
    },
  };
}

export interface FigureEditButtonOptions {
  isEditMode(): boolean;
  /** Opens the block editor on the figure with the form. */
  open(figure: Element): void;
}

export interface FigureEditButton {
  /** Shows the button over `element` when it is a figure; hides it otherwise. */
  sync(element: Element | undefined): void;
  hide(): void;
  /** True for the button itself, so that moving onto it does not count as leaving the figure. */
  owns(node: unknown): boolean;
}

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-153
/**
 * Edit mode: the "Edit figure" button over the hovered figure. It lives outside the rendered
 * content (a child of the body, placed through the CSSOM), so content patches never touch it and
 * a press does not move the focus.
 */
export function installFigureEditButton(
  document: Document,
  window: Window & typeof globalThis,
  options: FigureEditButtonOptions,
): FigureEditButton {
  let control: HTMLButtonElement | undefined;
  let current: Element | undefined;

  const hide = (): void => {
    current = undefined;
    control?.setAttribute("hidden", "");
  };
  const ensure = (): HTMLButtonElement => {
    if (control) return control;
    const created = document.createElement("button");
    created.className = "sphinx-preview-figure-edit-button";
    created.setAttribute("type", "button");
    created.setAttribute("data-sphinx-figure-edit", "true");
    created.setAttribute("aria-label", "Edit figure");
    created.setAttribute("title", "Edit figure");
    created.textContent = "Edit figure";
    created.setAttribute("hidden", "");
    created.addEventListener("mousedown", (event: Event) => event.preventDefault?.());
    created.addEventListener("click", (event: Event) => {
      event.preventDefault?.();
      event.stopPropagation?.();
      const figure = current;
      hide();
      if (figure && options.isEditMode()) options.open(figure);
    });
    document.body.appendChild(created);
    control = created;
    return created;
  };
  window.addEventListener("scroll", hide, true);

  return {
    sync(element) {
      if (!options.isEditMode() || !element || String(element.tagName).toUpperCase() !== "FIGURE") {
        hide();
        return;
      }
      if (element === current) return;
      const button = ensure();
      current = element;
      const bounds = element.getBoundingClientRect();
      button.style.setProperty("top", Math.round(bounds.top + 6) + "px");
      button.style.setProperty(
        "left", Math.round(Math.max(8, (bounds.right ?? bounds.left + bounds.width) - 96)) + "px");
      button.removeAttribute("hidden");
    },
    hide,
    owns(node) {
      return Boolean(control) && node === control;
    },
  };
}
