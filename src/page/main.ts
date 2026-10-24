/**
 * Entry of the page bundle `out/bundle/preview.js` in a VS Code webview: reads the boot context the
 * host wrote into the page as JSON, wraps the webview API in a {@link HostTransport} and starts the
 * runtime. Another host ships its own entry with its own transport.
 */

import { readBootContext } from "./bootContext";
import { createVsCodeTransport, type HostTransport, type VsCodeWebviewApi } from "./hostTransport";
import { startPreviewRuntime } from "./runtime";

declare function acquireVsCodeApi(): VsCodeWebviewApi;

const context = readBootContext(document);
const transport: HostTransport = createVsCodeTransport(acquireVsCodeApi(), window);
startPreviewRuntime(context, transport);
