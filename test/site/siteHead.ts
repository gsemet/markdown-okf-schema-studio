import { relativeSitePath } from "./siteLinks";
import { escapeHtml, socialMetaTags, type SocialCard } from "./socialCard";

/**
 * The head tags every page of the site shares: charset, viewport, favicon, title and, when the page
 * has a social card, its Open Graph and Twitter tags. `title` is the whole title text.
 */
export function headTags(title: string, currentPage: string, card?: SocialCard): string {
  return [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<link rel="icon" href="${relativeSitePath(currentPage, "favicon.svg")}" type="image/svg+xml">`,
    `<title>${escapeHtml(title)}</title>`,
    ...(card ? [socialMetaTags(card)] : []),
  ].join("\n");
}
