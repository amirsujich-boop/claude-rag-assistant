import { test } from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/store.js";

test("search ranks by cosine similarity and applies the threshold", () => {
  const s = new Store("/tmp/does-not-exist.json");
  s.add({ id: "a#0", source: "a.md", text: "a", vector: [1, 0, 0] });
  s.add({ id: "b#0", source: "b.md", text: "b", vector: [0.7, 0.7, 0] });
  s.add({ id: "c#0", source: "c.md", text: "c", vector: [0, 0, 1] });
  const hits = s.search([1, 0, 0], 5, 0.25);
  assert.deepEqual(hits.map((h) => h.id), ["a#0", "b#0"]);
  assert.ok(!("vector" in hits[0]));
});

test("removeSource drops all chunks of a file", () => {
  const s = new Store("/tmp/x.json");
  s.add({ id: "a#0", source: "a.md", text: "", vector: [1] });
  s.add({ id: "a#1", source: "a.md", text: "", vector: [1] });
  s.add({ id: "b#0", source: "b.md", text: "", vector: [1] });
  s.removeSource("a.md");
  assert.equal(s.size, 1);
});
