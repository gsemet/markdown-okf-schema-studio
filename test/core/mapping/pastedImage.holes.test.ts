import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  MAX_PASTED_IMAGE_BASE64_LENGTH,
  MAX_PASTED_IMAGE_BYTES,
  PASTED_IMAGE_EXTENSION,
  PASTED_IMAGE_MIME_TYPES,
  imageTypeOfMime,
  isBase64,
  nextImageName,
  sniffImage,
} from "../../../src/core/mapping/pastedImage";

// Tests added by the mutation campaign of src/core (CR-450): they pin the survivors of the first run.

const bytes = (...values: number[]) => Uint8Array.from(values);

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-196#S1
test("the pasted-image caps are 10 MiB of pixels and 14 million base64 characters", () => {
  assert.equal(MAX_PASTED_IMAGE_BYTES, 10_485_760);
  assert.equal(MAX_PASTED_IMAGE_BASE64_LENGTH, 14_000_000);
  // 10 MiB in base64 (4 characters per 3 bytes, padded) plus the data-URL framing fits under the cap.
  assert.ok(Math.ceil(MAX_PASTED_IMAGE_BYTES / 3) * 4 < MAX_PASTED_IMAGE_BASE64_LENGTH);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-196#S1
test("each image type is saved with its own extension and announced with its own MIME type", () => {
  assert.deepEqual(PASTED_IMAGE_EXTENSION, { png: "png", jpeg: "jpg", gif: "gif", webp: "webp" });
  assert.deepEqual([...PASTED_IMAGE_MIME_TYPES], ["image/png", "image/jpeg", "image/gif", "image/webp"]);
  for (const mime of PASTED_IMAGE_MIME_TYPES) assert.notEqual(imageTypeOfMime(mime), undefined, mime);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-196#S4
// @tests_req SwRS-MDOKFSTUDIO-PALETTE-196#S5
test("sniffImage accepts input exactly as long as the signature and refuses one byte less", () => {
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  assert.equal(sniffImage(bytes(...png)), "png");
  assert.equal(sniffImage(bytes(...png.slice(0, -1))), undefined);
  assert.equal(sniffImage(bytes(0xff, 0xd8, 0xff)), "jpeg");
  assert.equal(sniffImage(bytes(0xff, 0xd8)), undefined);
  assert.equal(sniffImage(Buffer.from("GIF87a")), "gif");
  assert.equal(sniffImage(Buffer.from("GIF89a")), "gif");
  assert.equal(sniffImage(Buffer.from("GIF89")), undefined);
  assert.equal(sniffImage(Buffer.from("RIFF\0\0\0\0WEBP")), "webp");
  assert.equal(sniffImage(Buffer.from("RIFF\0\0\0\0WEB")), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-196#S1
test("a WebP needs both the RIFF tag at the start and the WEBP tag at offset 8", () => {
  assert.equal(sniffImage(Buffer.from("XXXXXXXXWEBPVP8 ")), undefined, "no RIFF tag");
  assert.equal(sniffImage(Buffer.from("RIFF\0\0\0\0WEBP")), "webp");
  assert.equal(sniffImage(Buffer.from("WEBPRIFF\0\0\0\0")), undefined, "tags swapped");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-196#S1
test("each announced MIME type maps to its own type, and anything else maps to none", () => {
  assert.equal(imageTypeOfMime("image/png"), "png");
  assert.equal(imageTypeOfMime("image/jpeg"), "jpeg");
  assert.equal(imageTypeOfMime("image/gif"), "gif");
  assert.equal(imageTypeOfMime("image/webp"), "webp");
  assert.equal(imageTypeOfMime(""), undefined);
  assert.equal(imageTypeOfMime("image/jpg"), undefined);
  assert.equal(imageTypeOfMime("IMAGE/PNG"), undefined);
  assert.equal(imageTypeOfMime("image/bmp"), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-196#S4
// @tests_req SwRS-MDOKFSTUDIO-PALETTE-196#S5
test("isBase64 refuses a foreign character anywhere in a string of valid length", () => {
  assert.equal(isBase64("AAAA"), true);
  assert.equal(isBase64("AA=="), true);
  assert.equal(isBase64("AAA="), true);
  assert.equal(isBase64("AA A"), false, "a space inside");
  assert.equal(isBase64("!AAA"), false, "a bad first character");
  assert.equal(isBase64("AAA!"), false, "a bad last character");
  assert.equal(isBase64("A=AA"), false, "padding in the middle");
  assert.equal(isBase64("A==="), false, "three padding characters");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-196#S4
test("nextImageName still finds image-1000 and gives up only after it", () => {
  const upTo = (last: number) => ["image.png", ...Array.from({ length: last }, (_, index) => `image-${index + 1}.png`)];
  assert.equal(nextImageName(new Set(upTo(999)), "png"), "image-1000.png");
  assert.equal(nextImageName(new Set(upTo(1000)), "png"), undefined);
});
