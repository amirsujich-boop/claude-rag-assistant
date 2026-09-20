// Split a document into overlapping chunks that fit comfortably in an embedding model.
// Splits on paragraph boundaries first, then falls back to sentences, then hard cuts.

const DEFAULTS = { maxChars: 1200, overlap: 150 };

export function chunkText(text, opts = {}) {
  const { maxChars, overlap } = { ...DEFAULTS, ...opts };
  const clean = text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
  if (!clean) return [];

  const paragraphs = clean.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let current = "";

  const push = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };

  for (const para of paragraphs) {
    if (para.length > maxChars) {
      push();
      for (const piece of splitLong(para, maxChars, overlap)) chunks.push(piece);
      continue;
    }
    if ((current + "\n\n" + para).length > maxChars) {
      push();
      // carry a tail of the previous chunk forward so context is not lost at the seam
      const prev = chunks[chunks.length - 1] || "";
      current = prev.slice(-overlap) + "\n\n" + para;
    } else {
      current = current ? current + "\n\n" + para : para;
    }
  }
  push();
  return chunks;
}

function splitLong(text, maxChars, overlap) {
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [text];
  const out = [];
  let buf = "";
  for (const s of sentences) {
    if ((buf + s).length > maxChars) {
      if (buf) out.push(buf.trim());
      buf = buf.slice(-overlap) + s;
      while (buf.length > maxChars) {
        out.push(buf.slice(0, maxChars).trim());
        buf = buf.slice(maxChars - overlap);
      }
    } else {
      buf += s;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}
