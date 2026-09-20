// Local embeddings with a small sentence-transformer. No API key, no data leaves the machine.
// The model downloads once (~90 MB) into ./.cache on first run.

import { pipeline, env } from "@xenova/transformers";

env.cacheDir = process.env.MODEL_CACHE_DIR || "./.cache";

const MODEL = process.env.EMBED_MODEL || "Xenova/all-MiniLM-L6-v2";
let extractor;

async function getExtractor() {
  if (!extractor) extractor = await pipeline("feature-extraction", MODEL, { quantized: true });
  return extractor;
}

export async function embed(texts) {
  const list = Array.isArray(texts) ? texts : [texts];
  const ex = await getExtractor();
  const out = [];
  for (const t of list) {
    const res = await ex(t, { pooling: "mean", normalize: true });
    out.push(Array.from(res.data));
  }
  return out;
}

export function cosine(a, b) {
  // vectors are normalised, so the dot product is the cosine similarity
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
