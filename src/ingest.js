// Usage: npm run ingest -- ./docs
// Reads .md, .txt and .html files from a folder, chunks them, embeds them and writes data/index.json.
// Re-running replaces chunks for files that changed; unchanged files are skipped.

import "dotenv/config";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, extname, relative } from "node:path";
import { createHash } from "node:crypto";
import { chunkText } from "./chunk.js";
import { embed } from "./embed.js";
import { Store } from "./store.js";

const ROOT = process.argv[2] || "./docs";
const ALLOWED = new Set([".md", ".txt", ".html", ".htm"]);

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (ALLOWED.has(extname(entry.name).toLowerCase())) yield p;
  }
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/(p|div|h\d|li|br|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ");
}

const store = await new Store(process.env.INDEX_PATH).load();
const seen = new Map(store.items.map((i) => [i.source, i.id.split("#")[0]]));

let files = 0, chunks = 0, skipped = 0;
for await (const file of walk(ROOT)) {
  const source = relative(ROOT, file);
  const raw = await readFile(file, "utf8");
  const hash = createHash("sha1").update(raw).digest("hex").slice(0, 10);
  if (seen.get(source) === hash) { skipped++; continue; }

  const text = extname(file).startsWith(".htm") ? stripHtml(raw) : raw;
  const parts = chunkText(text);
  if (!parts.length) continue;

  store.removeSource(source);
  const vectors = await embed(parts);
  parts.forEach((t, i) => store.add({ id: `${hash}#${i}`, source, text: t, vector: vectors[i] }));

  files++;
  chunks += parts.length;
  const mtime = (await stat(file)).mtime.toISOString().slice(0, 10);
  console.log(`indexed ${source} (${parts.length} chunks, modified ${mtime})`);
}

await store.save();
console.log(`done: ${files} files, ${chunks} chunks (${skipped} unchanged). index size: ${store.size}`);
