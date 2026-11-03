import type { CodeBlockValues } from "./codeBlockDirective";

export interface CodeBlockPanelDeps {
  /** Starting values. */
  values: CodeBlockValues;
  /** "new": no directive at the caret yet (the submit button says Insert). */
  mode: "new" | "edit";
  /** Field name to message; an empty object lets the values through. */
  validate(values: CodeBlockValues): Record<string, string>;
  onSubmit(values: CodeBlockValues): void;
  /** Escape or the Cancel button. */
  onCancel(): void;
  /** Focus left the panel for something outside the editor frame. */
  onLeave(): void;
  isInsideFrame(node: unknown): boolean;
}

export interface CodeBlockPanel {
  element: HTMLElement;
  focusFirst(): void;
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
  preventDefault?: () => void;
  stopPropagation?: () => void;
};

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-272
/**
 * The code-block form: Language, Line numbers, Emphasized lines, Caption and Name, shown under the
 * edition palette with the look of the figure form. It only collects the values; the caller writes
 * the directive. Enter in a field and Cmd/Ctrl+Enter apply; Escape cancels; Tab cycles inside the
 * panel. An invalid value shows its message under the field and keeps the panel open.
 */
export function createCodeBlockPanel(document: Document, deps: CodeBlockPanelDeps): CodeBlockPanel {
  let closed = false;
  const root = document.createElement("div");
  root.className = "sphinx-preview-figure-panel";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", "Code-block options");
  root.setAttribute("data-sphinx-code-block-panel", "true");
  root.addEventListener("mousedown", (event: Event) => {
    const tag = String((event.target as { tagName?: string } | null)?.tagName ?? "").toUpperCase();
    if (tag === "INPUT" || tag === "SELECT") return;
    event.preventDefault?.();
  });
  root.addEventListener("click", (event: { stopPropagation?: () => void }) => event.stopPropagation?.());

  const title = document.createElement("div");
  title.className = "sphinx-preview-figure-panel-title";
  title.textContent = "Code-block";
  root.appendChild(title);

  const errors = new Map<string, HTMLElement>();
  const stops: HTMLElement[] = [];

  function row(name: string, label: string, control: HTMLElement): void {
    control.setAttribute("aria-label", label);
    control.setAttribute("data-code-block-field", name);
    const wrapper = document.createElement("label");
    wrapper.className = "sphinx-preview-figure-panel-row";
    const caption = document.createElement("span");
    caption.textContent = label;
    wrapper.appendChild(caption);
    wrapper.appendChild(control);
    const problem = document.createElement("div");
    problem.className = "sphinx-preview-figure-panel-error";
    problem.setAttribute("role", "alert");
    problem.setAttribute("data-code-block-error", name);
    problem.hidden = true;
    errors.set(name, problem);
    wrapper.appendChild(problem);
    root.appendChild(wrapper);
    stops.push(control);
  }
  function input(value: string, placeholder?: string): HTMLInputElement {
    const control = document.createElement("input");
    control.setAttribute("type", "text");
    control.setAttribute("spellcheck", "false");
    control.setAttribute("autocomplete", "off");
    if (placeholder) control.setAttribute("placeholder", placeholder);
    control.value = value;
    return control;
  }

  const language = input(deps.values.language, "python");
  const linenos = document.createElement("select");
  for (const [value, label] of [["off", "Off"], ["on", "On"]]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    linenos.appendChild(option);
  }
  linenos.value = deps.values.linenos ? "on" : "off";
  const emphasizeLines = input(deps.values.emphasizeLines, "1,3-5");
  const caption = input(deps.values.caption);
  const name = input(deps.values.name);
  row("language", "Language", language);
  row("linenos", "Line numbers", linenos);
  row("emphasizeLines", "Emphasized lines", emphasizeLines);
  row("caption", "Caption", caption);
  row("name", "Name", name);

  const actions = document.createElement("div");
  actions.className = "sphinx-preview-figure-panel-actions";
  function button(id: string, label: string): HTMLButtonElement {
    const control = document.createElement("button");
    control.setAttribute("type", "button");
    control.setAttribute("data-code-block-action", id);
    control.textContent = label;
    actions.appendChild(control);
    stops.push(control);
    return control;
  }
  const apply = button("apply", deps.mode === "new" ? "Insert" : "Apply");
  const cancel = button("cancel", "Cancel");
  root.appendChild(actions);

  const read = (): CodeBlockValues => ({
    language: language.value, linenos: linenos.value === "on", emphasizeLines: emphasizeLines.value,
    caption: caption.value, name: name.value,
  });
  const submit = (): void => {
    if (closed) return;
    const values = read();
    const problems = deps.validate(values);
    let firstProblem: HTMLElement | undefined;
    for (const [fieldName, element] of errors) {
      const message = problems[fieldName];
      element.textContent = message ?? "";
      element.hidden = message === undefined;
      const control = stops.find((stop) => stop.getAttribute("data-code-block-field") === fieldName);
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
  const press = (run: () => void) => (event: { preventDefault?: () => void; stopPropagation?: () => void }): void => {
    event.preventDefault?.();
    event.stopPropagation?.();
    run();
  };
  apply.addEventListener("click", press(submit));
  cancel.addEventListener("click", press(() => {
    if (!closed) deps.onCancel();
  }));

  for (const stop of stops) {
    stop.addEventListener("keydown", (event: KeyEventLike) => {
      if (event.isComposing) return;
      const done = (run: () => void): void => press(run)(event);
      if (event.key === "Escape") {
        done(() => deps.onCancel());
      } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !event.altKey) {
        done(submit);
      } else if (event.key === "Enter" && stop !== apply && stop !== cancel && !event.shiftKey && !event.altKey) {
        done(submit);
      } else if (event.key === "Tab" && !event.altKey && !event.metaKey && !event.ctrlKey) {
        const wrap = event.shiftKey ? stop === stops[0] : stop === stops[stops.length - 1];
        if (wrap) done(() => stops[event.shiftKey ? stops.length - 1 : 0].focus({ preventScroll: true }));
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
      language.focus({ preventScroll: true });
      if (typeof language.select === "function") language.select();
    },
    destroy() {
      closed = true;
      root.remove();
    },
  };
}
