# claude-rag-assistant

A small support assistant you can run on your own server. Put your documents in a folder, run one command, and you get an API plus a chat widget that answers customer questions **only from those documents** and says so when it does not know.

I built this for the kind of business that answers the same thirty questions every day on chat, email and the phone. It is deliberately boring: no vector database to operate, no framework to learn, one process to run.

```
docs/*.md  ──ingest──▶  data/index.json  ──search──▶  Claude  ──▶  answer + sources
                        (local embeddings)            (grounded)
```

## What it does

- **Ingest** `.md`, `.txt` and `.html` files, chunk them sensibly (paragraph → sentence → hard cut, with overlap), embed them **locally** with a small sentence-transformer. Nothing leaves the machine at this step; re-running only re-indexes files that changed.
- **Answer** with Claude using the top matching chunks as context. The system prompt forbids inventing prices, policies or contact details and tells the model to hand over to a human when the documents do not cover the question.
- **Serve** a JSON API (`POST /api/chat`) with CORS, a simple per-IP rate limit and a health endpoint.
- **Embed** on any website with a single `<script>` tag (`public/widget.js`). The widget keeps the conversation history in the browser and shows which document the answer came from.

## Quick start

```bash
git clone https://github.com/amirsujich-boop/claude-rag-assistant
cd claude-rag-assistant
npm install
cp .env.example .env            # add your ANTHROPIC_API_KEY
npm run ingest -- ./docs        # index the sample documents (first run downloads the ~90 MB embedding model)
npm start                       # http://localhost:3000
```

Open `http://localhost:3000`, click the button in the corner and ask *"How long do I have to return a product?"*.

## Put it on your site

```html
<script src="https://assistant.yourdomain.com/widget.js"
        data-endpoint="https://assistant.yourdomain.com/api/chat"
        data-title="Ask us"
        data-accent="#1d1a14"></script>
```

Set `ALLOWED_ORIGINS=https://yourdomain.com` in `.env` so only your site can call the API.

## API

`POST /api/chat`

```json
{ "question": "Do you ship to Germany?", "history": [{ "role": "user", "content": "..." }, { "role": "assistant", "content": "..." }] }
```

```json
{ "answer": "Yes. Delivery to EU countries takes 3-6 working days ...", "sources": [{ "source": "shipping.md", "score": 0.71 }], "grounded": true }
```

`grounded: false` means nothing relevant was found; the answer will say it cannot help and offer a human. Use that flag to trigger a hand-over in your own system.

## Configuration

| Variable | Default | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | – | required |
| `CLAUDE_MODEL` | `claude-sonnet-4-5` | any current Claude model |
| `COMPANY_NAME` | `this business` | used in the system prompt |
| `ALLOWED_ORIGINS` | `*` | comma-separated list for production |
| `INDEX_PATH` | `./data/index.json` | where the index lives |
| `EMBED_MODEL` | `Xenova/all-MiniLM-L6-v2` | any sentence-transformers model on the Hub |

## Where this stops

- The JSON index is fine up to a few thousand chunks. Beyond that, swap `src/store.js` for pgvector or Qdrant; the interface is three methods.
- Conversation memory lives in the browser, not on the server. Add a session store if you need it.
- Rate limiting is in-process. Put it behind a reverse proxy in production.

## Tests

```bash
npm test
```

MIT.
