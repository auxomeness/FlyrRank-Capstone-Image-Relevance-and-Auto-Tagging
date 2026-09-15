# AI Image Understanding & Content Matching

Backend AI Engineering capstone for matching blog posts to a trustworthy image library. The system ingests images, creates structured image metadata, embeds image captions and post text, ranks candidate matches, and rejects unsafe matches with a mismatch guard.

The required demo behavior is covered: a red fox post ranks a fox image first, a forced wolf candidate is rejected with a clear subject mismatch, and an unrelated space post returns `no_confident_match`.

## Tech Stack

- Node.js + Express
- PostgreSQL 16 in Docker
- Zod validation
- Gemini-compatible vision and embedding adapter
- Deterministic mock AI provider for free local verification

## Architecture

```text
image manifest + PNG corpus
        |
        v
POST /jobs/ingest-images
        |
        v
vision metadata -> Zod schema -> image_metadata
        |
        v
caption embedding -> image_vectors

post text -> post embedding -> cosine ranking
        |
        v
mismatch guard: category + subject + confidence + similarity
        |
        v
suggestions, rejections, reviews, cost logs
```

## Run Locally

Requirements: Node.js 20+, Docker Desktop, npm.

```bash
cp .env.example .env
docker compose up -d db
npm install
npm run db:migrate
npm run seed
npm run job:ingest
npm start
```

The API runs at `http://localhost:3000`.

By default, `.env.example` uses `AI_PROVIDER=mock` so the project can be graded without a paid API key. To use Gemini, set `AI_PROVIDER=gemini` and add `GEMINI_API_KEY`.

## Test And Eval

```bash
npm test
npm run eval
```

Current eval result:

```text
Top-1 precision: 11/11 (100.0%)
Forced rejection checks: 12/12
No confident match checks: 1/1
```

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/evidence/health` | Reviewer health check and cost-log status |
| POST | `/jobs/ingest-images` | Queue an image metadata and embedding job |
| GET | `/jobs/:id` | Inspect job progress, failures, retries, and costs |
| POST | `/posts` | Create or update a post |
| GET | `/posts/:id/images` | Get ranked image suggestions or `no_confident_match` |
| POST | `/posts/:id/images/:imageId/force-check` | Run the mismatch guard on one forced candidate |
| POST | `/suggestions/:id/approve` | Approve a suggestion |
| POST | `/suggestions/:id/reject` | Reject a suggestion |

## Evidence Probes

```bash
curl -s http://localhost:3000/evidence/health
curl -s http://localhost:3000/posts/post-red-fox/images
curl -s -X POST http://localhost:3000/posts/post-red-fox/images/animal-wolf-01/force-check
curl -s http://localhost:3000/posts/post-space-nebula/images
```

Expected outcomes:

- `post-red-fox` returns `animal-red-fox-01` as rank 1.
- Forced `animal-wolf-01` for the fox post returns `decision: "rejected"`.
- `post-space-nebula` returns `status: "no_confident_match"`.

## Dataset

The project includes 40 generated placeholder PNG images in `data/images/`, grouped across animals, food, technology, nature, transport, people, and objects. The animal subset intentionally includes red fox, wolf, dog, bear, and deer examples so the mismatch guard can be tested against visually and semantically close candidates.

The generated images are local project assets, not scraped stock photos.

## Gemini References

The Gemini adapter follows the official Generate Content and Embeddings APIs:

- [Gemini Generate Content API](https://ai.google.dev/api/generate-content)
- [Gemini image understanding guide](https://ai.google.dev/gemini-api/docs/generate-content/image-understanding)
- [Gemini embeddings guide](https://ai.google.dev/gemini-api/docs/embeddings)

## Limitations

- The default mock provider is deterministic and free, but it is not real image understanding. It exists so reviewers can run the full pipeline without keys.
- The Express job worker is in-process. For production, it should move to a durable queue.
- Embeddings are stored as JSON arrays in Postgres for portability. A production version should use `pgvector`.
- The image corpus is intentionally small. The goal is trustworthy ranking and rejection behavior, not a large search engine.
