import "dotenv/config";
import express from "express";
import { Store } from "./store.js";
import { answer } from "./answer.js";

const PORT = process.env.PORT || 3000;
const COMPANY = process.env.COMPANY_NAME || "this business";
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "*").split(",").map((s) => s.trim());

const store = await new Store(process.env.INDEX_PATH).load();
if (!store.size) console.warn("index is empty. Run `npm run ingest -- ./docs` first.");

const app = express();
app.use(express.json({ limit: "64kb" }));
app.use(express.static("public"));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// very small in-memory rate limit per IP: 30 questions / 10 minutes
const hits = new Map();
app.use("/api/chat", (req, res, next) => {
  const key = req.ip;
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (arr.length >= 30) return res.status(429).json({ error: "Too many requests, try again in a few minutes." });
  arr.push(now);
  hits.set(key, arr);
  next();
});

app.post("/api/chat", async (req, res) => {
  const { question, history } = req.body || {};
  if (typeof question !== "string" || !question.trim() || question.length > 2000) {
    return res.status(400).json({ error: "question is required (max 2000 chars)" });
  }
  try {
    const result = await answer({ store, question: question.trim(), history: Array.isArray(history) ? history : [], company: COMPANY });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "The assistant is unavailable right now." });
  }
});

app.get("/api/health", (req, res) => res.json({ ok: true, chunks: store.size, model: process.env.CLAUDE_MODEL || "claude-sonnet-4-5" }));

app.listen(PORT, () => console.log(`assistant for "${COMPANY}" on http://localhost:${PORT} (${store.size} chunks)`));
