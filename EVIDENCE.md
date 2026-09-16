# Evidence

## AI Processing

- Vision model output is validated by `imageMetadataSchema` in `src/domain/schemas.js`.
- Invalid responses are rejected by tests in `scripts/test.js`.
- Low-confidence classifications are flagged instead of accepted by `src/jobs/ingestImages.js`.
- Images are processed through a tracked ingestion job with bounded retries in `src/jobs/ingestImages.js`.
- Vision and embedding calls are written to `cost_logs`.

Current image metadata status:

```json
[
  { "status": "accepted", "count": 40 }
]
```

Recent successful Gemini cost summary:

```json
[
  { "call_type": "vision", "provider": "gemini", "model": "gemini-3.6-flash", "status": "accepted", "calls": 21 },
  { "call_type": "vision", "provider": "gemini", "model": "gemini-3.1-flash-lite", "status": "accepted", "calls": 19 },
  { "call_type": "embedding", "provider": "gemini", "model": "gemini-embedding-001", "status": "ok", "calls": 40 }
]
```

Earlier failed calls are also retained in `cost_logs`, which proves failed model/quota attempts were recorded instead of hidden.

## Matching System

- Image embeddings are stored in `image_vectors`.
- Post embeddings are stored in `post_vectors`.
- `GET /posts/:id/images` returns ranked suggestions.
- Ranking uses cosine similarity plus a small lexical compatibility boost. The mismatch guard still decides whether a candidate can be trusted.

Fox ranking proof:

```json
{
  "post_id": "post-red-fox",
  "status": "suggestions",
  "suggestions": [
    {
      "image_id": "animal-red-fox-02",
      "rank": 1,
      "decision": "suggested",
      "candidate": {
        "subject": "cross fox",
        "category": "animal",
        "confidence": 0.95
      }
    }
  ]
}
```

## Safety Layer

- Fox post ranks a fox image first.
- Forced wolf candidate for fox post is rejected.
- Unrelated space post returns `no_confident_match`.

Forced wolf rejection:

```json
{
  "post_id": "post-red-fox",
  "image_id": "animal-wolf-01",
  "decision": "rejected",
  "reason": "Subject mismatch: expected red fox, detected gray wolf."
}
```

No-match proof:

```json
{
  "post_id": "post-space-nebula",
  "status": "no_confident_match",
  "suggestions": [
    {
      "image_id": null,
      "decision": "no_confident_match"
    }
  ]
}
```

## Backend

- Database models and indexes exist: `migrations/001_init.sql`.
- API endpoints exist in `src/http/routes.js`.
- Review workflow exists through `POST /suggestions/:id/approve` and `POST /suggestions/:id/reject`.
- Docker Compose starts the PostgreSQL database with a named volume.

Health output:

```json
{
  "status": "ok",
  "service": "ai-image-understanding-content-matching",
  "cost_log_groups": 9
}
```

## Quality

- `npm test` passes schema and guard tests.
- `npm run eval` passes the labeled dataset.
- README includes architecture, run steps, API table, evidence probes, and limitations.

Eval output:

```text
Top-1 precision: 9/11 (81.8%)
Forced rejection checks: 12/12
No confident match checks: 1/1
```
