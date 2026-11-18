import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_PHOTO_BASE64, parseGiftPhoto } from "../lib/gift-photo";

const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 7)]).toString("base64");

test("accepts a base64 JPEG", () => {
  assert.deepEqual(parseGiftPhoto({ contentType: "image/jpeg", data: jpeg }), { contentType: "image/jpeg", data: jpeg });
});
test("rejects anything that isn't a reasonable JPEG", () => {
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(200)]).toString("base64");
  for (const bad of [undefined, null, "x", { contentType: "image/png", data: jpeg }, { contentType: "image/jpeg", data: png },
    { contentType: "image/jpeg", data: "not base64!" + jpeg }, { contentType: "image/jpeg", data: "A".repeat(MAX_PHOTO_BASE64 + 4) }]) {
    assert.equal(parseGiftPhoto(bad), null);
  }
});
