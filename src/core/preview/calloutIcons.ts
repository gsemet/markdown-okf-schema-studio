/**
 * The badges of the callouts (admonitions, alerts, the warning banner): CSS mask images built from
 * 16x16 paths, so a badge takes the accent colour of its callout. Pure module: no host API, no DOM,
 * no Node built-ins.
 */

/** Builds a mask image from a 16x16 path, so the badge inherits the callout accent. */
function icon(path: string): string {
  return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%23fff' fill-rule='evenodd' d='${path}'/%3E%3C/svg%3E")`;
}

/** The callout badges, as CSS `url(...)` values. */
export const CALLOUT_ICONS = {
  info: icon(
    "M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11ZM7.25 6.9h1.5v4.6h-1.5V6.9ZM8 4a.95.95 0 1 1 0 1.9A.95.95 0 0 1 8 4Z",
  ),
  bulb: icon(
    "M8 1a4.4 4.4 0 0 0-2.65 7.92c.35.27.55.63.55 1v.58h4.2v-.58c0-.37.2-.73.55-1A4.4 4.4 0 0 0 8 1ZM5.9 11.9h4.2v1.2H5.9v-1.2Zm.5 2.3h3.2a1.6 1.6 0 0 1-3.2 0Z",
  ),
  triangle: icon(
    "M8 1.1 15.5 14.6H.5L8 1.1Zm0 3.1L3.1 13.1h9.8L8 4.2ZM7.3 6.8h1.4v3.4H7.3V6.8Zm0 4.2h1.4v1.4H7.3V11Z",
  ),
  octagon: icon(
    "M5 1h6l4 4v6l-4 4H5l-4-4V5l4-4Zm.62 1.5L2.5 5.62v4.76l3.12 3.12h4.76l3.12-3.12V5.62L10.38 2.5H5.62ZM7.3 4.6h1.4v4.2H7.3V4.6Zm0 5.2h1.4v1.4H7.3V9.8Z",
  ),
  cross: icon(
    "M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Zm2.6 1.84L8 6.94 5.4 4.34 4.34 5.4 6.94 8 4.34 10.6 5.4 11.66 8 9.06l2.6 2.6 1.06-1.06L9.06 8l2.6-2.6-1.06-1.06Z",
  ),
  star: icon(
    "M8 1.2 10.06 5.6 14.8 6.32l-3.44 3.42.82 4.86L8 12.3l-4.18 2.28.82-4.86L1.2 6.32 5.94 5.6 8 1.2Z",
  ),
  arrow: icon(
    "M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11ZM7.4 4.9 6.34 5.96 8.38 8l-2.04 2.04L7.4 11.1 10.5 8 7.4 4.9Z",
  ),
};
