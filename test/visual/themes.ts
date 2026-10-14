/**
 * VS Code theme variables the preview reads at runtime.
 *
 * The webview inherits these from the editor, so a browser-based visual test has to
 * supply them; without a value the CSS falls back to system colours and the screenshots
 * stop resembling anything a user would see.
 */

export interface PreviewTheme {
  id: string;
  label: string;
  variables: Record<string, string>;
}

const SHARED: Record<string, string> = {
  "--vscode-font-family": "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  "--vscode-markdown-font-family": "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  "--vscode-markdown-font-size": "14px",
  "--vscode-markdown-line-height": "1.6",
  "--vscode-editor-font-family": "'SF Mono', Menlo, Consolas, monospace",
};

export const THEMES: PreviewTheme[] = [
  {
    id: "dark",
    label: "Dark Modern",
    variables: {
      ...SHARED,
      "--vscode-editor-background": "#1f1f1f",
      "--vscode-editor-foreground": "#cccccc",
      "--vscode-textLink-foreground": "#4daafc",
      "--vscode-descriptionForeground": "#9d9d9d",
      "--vscode-widget-border": "#313131",
      "--vscode-panel-border": "#2b2b2b",
      "--vscode-textBlockQuote-background": "#292929",
      "--vscode-textCodeBlock-background": "#0d0d0d",
      "--vscode-focusBorder": "#0078d4",
      "--vscode-charts-blue": "#3794ff",
      "--vscode-charts-green": "#89d185",
      "--vscode-charts-purple": "#b180d7",
      "--vscode-charts-yellow": "#cca700",
      "--vscode-charts-orange": "#d18616",
      "--vscode-charts-red": "#f14c4c",
      "--vscode-editor-findMatchHighlightBackground": "#9e6a03",
      "--vscode-badge-background": "#4d4d4d",
      "--vscode-badge-foreground": "#cccccc",
    },
  },
  {
    id: "light",
    label: "Light Modern",
    variables: {
      ...SHARED,
      "--vscode-editor-background": "#ffffff",
      "--vscode-editor-foreground": "#3b3b3b",
      "--vscode-textLink-foreground": "#005fb8",
      "--vscode-descriptionForeground": "#6a6a6a",
      "--vscode-widget-border": "#e5e5e5",
      "--vscode-panel-border": "#e5e5e5",
      "--vscode-textBlockQuote-background": "#f8f8f8",
      "--vscode-textCodeBlock-background": "#f3f3f3",
      "--vscode-focusBorder": "#005fb8",
      "--vscode-charts-blue": "#1a85ff",
      "--vscode-charts-green": "#388a34",
      "--vscode-charts-purple": "#652d90",
      "--vscode-charts-yellow": "#bf8803",
      "--vscode-charts-orange": "#d18616",
      "--vscode-charts-red": "#e51400",
      "--vscode-editor-findMatchHighlightBackground": "#f8e3a1",
      "--vscode-badge-background": "#c4c4c4",
      "--vscode-badge-foreground": "#3b3b3b",
    },
  },
  {
    id: "fallback",
    label: "No host colors",
    variables: SHARED,
  },
];
