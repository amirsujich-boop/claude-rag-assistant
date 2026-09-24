import Anthropic from "@anthropic-ai/sdk";
import { embed } from "./embed.js";

const client = new Anthropic();
const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-5";

const SYSTEM = `You are the support assistant for {company}.
Answer only from the provided context. If the context does not contain the answer, say so plainly and offer to connect the person with a human.
Be short and concrete. Use the customer's language if they write in another language.
Never invent prices, dates, policies or contact details.`;

export async function answer({ store, question, history = [], company = "this business", k = 5 }) {
  const [qv] = await embed(question);
  const hits = store.search(qv, k);

  const context = hits.length
    ? hits.map((h, i) => `[${i + 1}] (${h.source})\n${h.text}`).join("\n\n")
    : "(no relevant documents found)";

  const messages = [
    ...history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: `Context:\n${context}\n\nQuestion: ${question}` },
  ];

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    system: SYSTEM.replace("{company}", company),
    messages,
  });

  const text = res.content.filter((c) => c.type === "text").map((c) => c.text).join("\n").trim();
  return {
    answer: text,
    sources: hits.map((h) => ({ source: h.source, score: Number(h.score.toFixed(3)) })),
    grounded: hits.length > 0,
  };
}
