# Design Document

## Problem

The system matches article content to images by meaning, not by filename. It must suggest a good image when the match is strong and reject unsafe matches when the best candidate is still wrong.

## Data Model

The core tables are `images`, `image_metadata`, `image_vectors`, `posts`, `post_vectors`, `suggestions`, `reviews`, `jobs`, and `cost_logs`.

Images keep the corpus file, source/license note, and expected labels used for seeded evaluation. `image_metadata` stores schema-validated AI vision output. Vectors are stored as JSON arrays because the capstone scope is about 50 images, small enough for simple in-process cosine ranking after loading rows from Postgres.

## Metadata Schema

Every image understanding result must match:

```json
{
  "subject": "red fox",
  "category": "animal",
  "attributes": ["orange fur", "wild", "forest"],
  "caption": "A red fox standing in a forest",
  "confidence": 0.94
}
```

Low-confidence metadata is stored as `flagged`, not silently trusted.

## Matching Strategy

The image caption and post title/body are embedded into the same semantic space. Matching ranks images by cosine similarity. A mismatch guard then checks:

- similarity is above the tuned threshold
- image confidence is above the confidence threshold
- category is compatible with the post
- subject is compatible with the post

If the guard rejects every candidate, the API returns `no_confident_match` with reasons.

## API Surface

The API supports image ingestion jobs, job status, post creation, ranked image lookup, forced candidate checks, approval, rejection, and health evidence.

## Non-goal

This is not a massive asset-management platform. The capstone intentionally stays near 40-50 images, one vision provider, one embedding provider, and a minimal review workflow.
