# EVIDENCE

Fill this file as each requirement is proven.

## AI Processing

- Vision model produces structured output validated against a schema: pending.
- Invalid responses are never trusted: pending.
- Low-confidence classifications are flagged instead of accepted: pending.
- Images are processed through a batch background job with retries: pending.
- Vision and embedding costs are tracked per call: pending.

## Matching System

- Image and post embeddings are stored: pending.
- Posts return ranked image suggestions: pending.
- Semantic matching works for equivalent concepts: pending.

## Safety Layer

- Fox post ranks fox first: pending.
- Forced wolf candidate for fox post is rejected: pending.
- No suitable image returns no confident match: pending.

## Backend

- Database models and indexes exist: `migrations/001_init.sql`.
- API endpoints validated: pending.
- Review workflow exists: pending.

## Quality

- Eval script reports top-1 precision: pending.
- README has architecture, run steps, and limitations: pending.
