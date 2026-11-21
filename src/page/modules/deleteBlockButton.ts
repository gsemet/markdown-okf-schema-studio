// @implements_req SwRS-MDOKFSTUDIO-BLOCK-265
/** The label of the Delete block button: its accessible name and its tooltip. */
const DELETE_BLOCK_LABEL = "Delete block";

/**
 * The "Delete block" button of a block's bar: a `×` that calls `onDelete` on a click. The look and
 * the place come from the stylesheet (`.sphinx-preview-delete`); the block bar and the blank-lines
 * block of edit mode build the same button through this one function.
 */
export function createDeleteBlockButton(document: Document, onDelete: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = "sphinx-preview-delete";
  button.setAttribute("type", "button");
  button.setAttribute("aria-label", DELETE_BLOCK_LABEL);
  button.setAttribute("title", DELETE_BLOCK_LABEL);
  button.textContent = "×";
  button.addEventListener("click", (event) => {
    event.preventDefault?.();
    event.stopPropagation?.();
    onDelete();
  });
  return button;
}
