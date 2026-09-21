// A flat JSON vector store. Fine up to a few thousand chunks, which covers most
// company knowledge bases. Swap for pgvector or Qdrant when you outgrow it.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { cosine } from "./embed.js";

export class Store {
  constructor(path = "./data/index.json") {
    this.path = path;
    this.items = [];
  }

  async load() {
    try {
      const raw = await readFile(this.path, "utf8");
      this.items = JSON.parse(raw);
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
      this.items = [];
    }
    return this;
  }

  async save() {
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, JSON.stringify(this.items));
  }

  add({ id, source, text, vector }) {
    this.items.push({ id, source, text, vector });
  }

  removeSource(source) {
    this.items = this.items.filter((i) => i.source !== source);
  }

  search(queryVector, k = 5, minScore = 0.25) {
    return this.items
      .map((i) => ({ ...i, score: cosine(queryVector, i.vector) }))
      .filter((i) => i.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .map(({ vector, ...rest }) => rest);
  }

  get size() {
    return this.items.length;
  }
}
