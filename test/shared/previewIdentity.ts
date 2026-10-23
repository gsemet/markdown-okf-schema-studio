/**
 * The identity a preview message carries on the wire (which document, which version of it, which
 * render), spelled in one place for the safety-net tests of the host and of the page. A rename of a
 * wire field changes the constant here and nothing in the tests that use it.
 */

/** The document the render belongs to. */
export const DOCUMENT_ID = "documentId";
/** The version of that document the render was made from. */
export const DOCUMENT_VERSION = "revision";
/** The render itself. */
export const REQUEST_ID = "requestId";
/** The field of a content patch that carries the identity the page moves to. */
export const PATCH_NEXT = "next";

/** The render a page shows, as the host addresses it. */
export interface PageIdentity {
  readonly [DOCUMENT_ID]: string;
  readonly [DOCUMENT_VERSION]: number;
  readonly [REQUEST_ID]: number;
}

/** The version and render part of an identity (what a content patch names as `next`). */
export type RenderIdentity = Omit<PageIdentity, typeof DOCUMENT_ID>;

export function pageIdentity(documentId: string, documentVersion: number, requestId: number): PageIdentity {
  return { [DOCUMENT_ID]: documentId, [DOCUMENT_VERSION]: documentVersion, [REQUEST_ID]: requestId };
}

export function renderIdentity(documentVersion: number, requestId: number): RenderIdentity {
  return { [DOCUMENT_VERSION]: documentVersion, [REQUEST_ID]: requestId };
}

/** The identity of the page the runtime harness boots (`runtimeHarness.ts`). */
export const HARNESS_PAGE: PageIdentity = pageIdentity("file:///active.md", 7, 11);

/** Every identity field set to `undefined`: merged into a message, it removes the identity. */
export const NO_IDENTITY: Readonly<Record<string, undefined>> = {
  [DOCUMENT_ID]: undefined,
  [DOCUMENT_VERSION]: undefined,
  [REQUEST_ID]: undefined,
};

/** The identity fields of a message or a runtime context, as they are (not validated). */
export function identityOf(message: Readonly<Record<string, unknown>>): PageIdentity {
  return {
    [DOCUMENT_ID]: message[DOCUMENT_ID] as string,
    [DOCUMENT_VERSION]: message[DOCUMENT_VERSION] as number,
    [REQUEST_ID]: message[REQUEST_ID] as number,
  };
}

/** The identity a content patch moves the page to. */
export function nextIdentityOf(patch: Readonly<Record<string, unknown>>): PageIdentity {
  const next = patch[PATCH_NEXT] as Record<string, unknown>;
  return { ...identityOf(next), [DOCUMENT_ID]: patch[DOCUMENT_ID] as string };
}
