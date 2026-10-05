import { test } from "node:test";
import assert from "node:assert/strict";
import { chunkText } from "../src/chunk.js";

test("returns nothing for empty input", () => {
  assert.deepEqual(chunkText("   \n\n "), []);
});

test("keeps short documents in one chunk", () => {
  const chunks = chunkText("Hello.\n\nThis is short.");
  assert.equal(chunks.length, 1);
});

test("respects the max size and overlaps on paragraph seams", () => {
  const para = "Sentence number one is here. ".repeat(20).trim(); // ~580 chars
  const text = [para, para, para, para].join("\n\n");
  const chunks = chunkText(text, { maxChars: 1200, overlap: 100 });
  assert.ok(chunks.length >= 2);
  for (const c of chunks) assert.ok(c.length <= 1300, `chunk too long: ${c.length}`);
  // the second chunk starts with the tail of the first
  assert.ok(chunks[1].startsWith(chunks[0].slice(-100).trim().slice(0, 20)));
});

test("splits a single very long paragraph", () => {
  const text = "Word ".repeat(2000).trim();
  const chunks = chunkText(text, { maxChars: 500, overlap: 50 });
  assert.ok(chunks.length > 10);
  for (const c of chunks) assert.ok(c.length <= 500);
});
