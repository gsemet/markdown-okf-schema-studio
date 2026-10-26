/**
 * The reason of a request that names an older render than the one the host holds. The page
 * recognizes it to send the request again after the next render, so both sides share this text.
 */
export const STALE_REQUEST = "The preview is out of date. Try again once it has refreshed.";
