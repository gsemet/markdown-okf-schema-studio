/**
 * The custom tooltip of frontmatter links: every link that is not still resolving (valid anchors,
 * and invalid or unavailable spans, which are keyboard-focusable) shows its title in a tooltip
 * placed below the link (above when there is no room), clear of the toolbar.
 */

/** Every frontmatter link that is not still resolving. */
const LINK_TOOLTIP_SELECTOR = ".okf-frontmatter-link:not([data-okf-link-status=\"pending\"])";

/** The link tooltip of a page. */
export interface LinkTooltip {
  /** Closes the open tooltip, if any, and gives the link its title back. */
  close(): void;
}

/** Shows the tooltip on hover and focus; scrolling, resizing, Escape and leaving the page close it. */
export function installLinkTooltip(document: Document, window: Window & typeof globalThis): LinkTooltip {
  let closeLinkTooltip = (): void => {};
  let tooltipLink: Element | undefined;
  let linkTooltipSequence = 0;
  const linkOf = (target: EventTarget | null): Element | null | undefined =>
    (target as Element | null)?.closest?.(LINK_TOOLTIP_SELECTOR);

  function showLinkTooltip(event: Event): void {
    const link = linkOf(event.target);
    if (!link || link === tooltipLink) return;
    closeLinkTooltip();
    const title = link.getAttribute("title");
    if (title === null) return;
    const describedBy = link.getAttribute("aria-describedby");
    const tooltip = document.createElement("div");
    const id = "sphinx-preview-link-tooltip-" + (++linkTooltipSequence);
    tooltip.className = "sphinx-preview-link-tooltip";
    tooltip.setAttribute("id", id);
    tooltip.setAttribute("role", "tooltip");
    tooltip.textContent = title;
    link.removeAttribute("title");
    link.setAttribute("aria-describedby", describedBy ? describedBy + " " + id : id);
    tooltipLink = link;
    closeLinkTooltip = () => {
      tooltip.remove();
      link.setAttribute("title", title);
      if (describedBy === null) link.removeAttribute("aria-describedby");
      else link.setAttribute("aria-describedby", describedBy);
      tooltipLink = undefined;
      closeLinkTooltip = () => {};
    };
    const margin = 8;
    const controlsHeight = Number.parseFloat(window.getComputedStyle?.(document.documentElement)
      ?.getPropertyValue?.("--sphinx-preview-controls-height")) || 116;
    const minimumTop = controlsHeight + margin;
    tooltip.style.setProperty("max-width", Math.max(1, Math.min(480, window.innerWidth - margin * 2)) + "px");
    tooltip.style.setProperty("max-height", Math.max(1, window.innerHeight - minimumTop - margin) + "px");
    document.body.appendChild(tooltip);
    const linkRect = link.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const below = linkRect.bottom + margin;
    const preferredTop = below + tooltipRect.height <= window.innerHeight - margin
      ? below : linkRect.top - tooltipRect.height - margin;
    tooltip.style.setProperty("left", Math.max(margin, Math.min(
      linkRect.left, window.innerWidth - tooltipRect.width - margin,
    )) + "px");
    tooltip.style.setProperty("top", Math.max(minimumTop, Math.min(
      preferredTop, window.innerHeight - tooltipRect.height - margin,
    )) + "px");
  }

  function leaveLinkTooltip(event: Event): void {
    if (tooltipLink && linkOf(event.target) === tooltipLink
      && !tooltipLink.contains((event as MouseEvent).relatedTarget as Node | null)) closeLinkTooltip();
  }

  document.addEventListener("mouseover", showLinkTooltip);
  document.addEventListener("focusin", showLinkTooltip);
  document.addEventListener("mouseout", leaveLinkTooltip);
  document.addEventListener("focusout", leaveLinkTooltip);
  document.addEventListener("pointerdown", (event) => {
    if (linkOf(event.target) !== tooltipLink) closeLinkTooltip();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeLinkTooltip();
  });
  window.addEventListener("scroll", () => closeLinkTooltip(), true);
  window.addEventListener("resize", () => closeLinkTooltip());
  window.visualViewport?.addEventListener("resize", () => closeLinkTooltip());
  window.addEventListener("pagehide", () => closeLinkTooltip());
  window.addEventListener("beforeunload", () => closeLinkTooltip());
  return { close: () => closeLinkTooltip() };
}
