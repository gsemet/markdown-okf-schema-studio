import * as assert from "node:assert/strict";
import { test } from "node:test";

import { imageTypeOfMime, isBase64, nextImageName, sniffImage } from "../../src/mapping/pastedImage";

const bytes = (...values: number[]) => Uint8Array.from(values);

test("sniffImage recognises png, jpeg, gif and webp by their magic bytes", () => {
  assert.equal(sniffImage(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0)), "png");
  assert.equal(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0)), "jpeg");
  assert.equal(sniffImage(Buffer.from("GIF89a....")), "gif");
  assert.equal(sniffImage(Buffer.from("GIF87a....")), "gif");
  assert.equal(sniffImage(Buffer.from("RIFF\0\0\0\0WEBPVP8 ")), "webp");
});

test("sniffImage refuses everything else, including SVG, text and short input", () => {
  assert.equal(sniffImage(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>")), undefined);
  assert.equal(sniffImage(Buffer.from("hello")), undefined);
  assert.equal(sniffImage(Buffer.from("RIFF\0\0\0\0WAVEfmt ")), undefined);
  assert.equal(sniffImage(bytes(0x89, 0x50)), undefined);
  assert.equal(sniffImage(bytes()), undefined);
});

test("a spoofed mime type is told apart from the bytes", () => {
  assert.equal(imageTypeOfMime("image/png"), "png");
  assert.equal(imageTypeOfMime("image/svg+xml"), undefined);
  assert.equal(imageTypeOfMime("text/html"), undefined);
  // The host compares the announced type with the sniffed one.
  assert.notEqual(sniffImage(Buffer.from("<html>")), imageTypeOfMime("image/png"));
});

test("nextImageName takes image.ext, then the first free suffix", () => {
  assert.equal(nextImageName(new Set(), "png"), "image.png");
  assert.equal(nextImageName(new Set(["image.png"]), "png"), "image-1.png");
  assert.equal(nextImageName(new Set(["image.png", "image-1.png", "image-2.png"]), "png"), "image-3.png");
  assert.equal(nextImageName(new Set(["image.png", "image-2.png"]), "png"), "image-1.png", "a gap is reused");
  assert.equal(nextImageName(new Set(["image.png"]), "jpg"), "image.jpg", "another extension is free");
  assert.equal(nextImageName(new Set(["IMAGE.PNG"]), "png"), "image-1.png", "case-insensitive file systems");
});

test("nextImageName gives up after 1000 suffixes", () => {
  const taken = new Set(["image.png", ...Array.from({ length: 1000 }, (_, index) => `image-${index + 1}.png`)]);
  assert.equal(nextImageName(taken, "png"), undefined);
});

test("isBase64 accepts the base64 alphabet only", () => {
  assert.equal(isBase64("aGVsbG8="), true);
  assert.equal(isBase64(""), true);
  assert.equal(isBase64("aGVsbG8"), false, "bad length");
  assert.equal(isBase64("data:image/png;base64,AAAA"), false);
  assert.equal(isBase64("AA AA"), false);
  assert.equal(isBase64("AAA=\n"), false);
});
