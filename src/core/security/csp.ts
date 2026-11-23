// @implements_req SwRS-MDOKFSTUDIO-TRUST-022
export function createNonce(): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/gu, "-").replace(/\//gu, "_");
}

// @implements_req SwRS-MDOKFSTUDIO-TRUST-012
export function createContentSecurityPolicy(cspSource: string, nonce: string): string {
  return [
    "default-src 'none'",
    // Inline SVG icons (admonition badges, preview styles) are embedded as data:
    // URIs and loaded as CSS masks/images, which are governed by img-src.
    `img-src ${cspSource} data:`,
    `style-src ${cspSource} 'nonce-${nonce}'`,
    `font-src ${cspSource}`,
    `media-src ${cspSource}`,
    `script-src ${cspSource} 'nonce-${nonce}'`,
    "connect-src 'none'",
    "frame-src 'none'",
    "object-src 'none'",
    "worker-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");
}
