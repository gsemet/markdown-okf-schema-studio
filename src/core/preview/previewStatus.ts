/**
 * The status region of a preview page: the label, the optional message and the diagnostics list
 * the host writes at the top of the body. Kept apart from `webview.ts` (which needs `vscode`) so the
 * visual page builder uses the same markup as the webview.
 */

import { escapeHtml } from "../syntax/markdownSyntax";

export type PreviewStatus =
  | "pending"
  | "success"
  | "stale"
  | "error"
  | "missing-source"
  | "recovery";

export interface PreviewStatusDiagnostic {
  message: string;
  file?: string;
  line?: number;
  column?: number;
  severity?: string;
  /** The diagnostic kind (`myst-extension` for the conf.py checks); the page reads it. */
  code?: string;
}

// @implements_req SwRS-MDOKFSTUDIO-LIFE-049
export const PREVIEW_STATUS_LABELS: Record<PreviewStatus, string> = {
  pending: "Preview pending",
  success: "Preview ready",
  stale: "Preview is stale",
  error: "Preview unavailable",
  "missing-source": "Preview source missing",
  recovery: "Preview recovered",
};

/** One line of the status region: the severity attribute and the formatted location and message. */
export interface PreviewStatusDiagnosticItem {
  severity: string;
  text: string;
  /** The diagnostic kind, when it has one: the warning banner counts the `myst-extension` lines. */
  code?: string;
}

// @implements_req SwRS-MDOKFSTUDIO-CORE-025
// @implements_req SwRS-MDOKFSTUDIO-MYST-072
/**
 * The text of one diagnostic as the status region shows it. The page markup and the in-place
 * content patch (T34) both use it, so a patched page shows the same lines as a loaded one.
 */
export function formatStatusDiagnostic(diagnostic: PreviewStatusDiagnostic): PreviewStatusDiagnosticItem {
  const location = diagnostic.file
    ? `${diagnostic.file}${diagnostic.line ? `:${diagnostic.line}` : ""}${diagnostic.column ? `:${diagnostic.column}` : ""}: `
    : "";
  return {
    severity: diagnostic.severity ?? "error",
    text: location + diagnostic.message,
    ...(typeof diagnostic.code === "string" && diagnostic.code !== "" ? { code: diagnostic.code } : {}),
  };
}

// @implements_req SwRS-MDOKFSTUDIO-LIFE-059
export function statusMarkup(
  status: PreviewStatus,
  message?: string,
  diagnostics: readonly PreviewStatusDiagnostic[] = [],
): string {
  const detail = message ? `<span data-sphinx-preview-status-message>${escapeHtml(message)}</span>` : "";
  const diagnosticItems = diagnostics.length > 0
    ? `<ul data-sphinx-preview-diagnostics>${diagnostics.map((diagnostic) => {
      const item = formatStatusDiagnostic(diagnostic);
      const code = item.code === undefined ? "" : ` data-sphinx-preview-diagnostic-code="${escapeHtml(item.code)}"`;
      return `<li data-sphinx-preview-diagnostic-severity="${escapeHtml(item.severity)}"${code}>${escapeHtml(item.text)}</li>`;
    }).join("")}</ul>`
    : "";
  return `<aside data-sphinx-preview-status="${status}" role="status" aria-live="polite"><strong>${PREVIEW_STATUS_LABELS[status]}</strong>${detail}${diagnosticItems}</aside>`;
}

export function setPreviewStatus(
  html: string,
  status: PreviewStatus,
  message?: string,
  diagnostics: readonly PreviewStatusDiagnostic[] = [],
): string {
  const markup = statusMarkup(status, message, diagnostics);
  const withoutStatus = html.replace(
    /<aside\s+data-sphinx-preview-status="[^"]+"[^>]*>[\s\S]*?<\/aside>/iu,
    "",
  );
  if (/<body(?:\s[^>]*)?>/iu.test(withoutStatus)) {
    return withoutStatus.replace(/(<body(?:\s[^>]*)?>)/iu, `$1${markup}`);
  }
  return `${withoutStatus}${markup}`;
}
