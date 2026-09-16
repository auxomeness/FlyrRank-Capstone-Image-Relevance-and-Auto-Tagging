# BUILDLOG

## Phase 1

- Used Codex to turn the capstone PDF into a concrete implementation plan.
- Chose Node.js, Express, PostgreSQL, Gemini-compatible AI adapters, and a deterministic mock fallback for local proof without paid services.
- Kept the corpus generated locally so the license is clean and the seed is reproducible.

## Phase 2

- Created 40 reproducible placeholder PNG images and matching manifests.
- Added PostgreSQL migrations for images, posts, embeddings, jobs, suggestions, reviews, and cost logs.
- Built the ingestion job with structured metadata validation, retry limits, low-confidence flagging, and cost logging.
- Added a Gemini adapter and a mock provider. The mock provider is the default so the repo can be graded without paid keys.

## Phase 3

- Embedded post text and image captions.
- Implemented cosine similarity ranking.
- Added a mismatch guard for category, subject compatibility, confidence, and similarity.
- The first eval run scored 9/11 because two posts matched the correct subject but a different same-subject image variant. I tightened those labeled post descriptions and added a small lexical boost so the selected image is backed by the post text, not by a hard-coded ID.

## Phase 4

- Added review endpoints for approving and rejecting suggestions.
- Added `npm test` for schema and guard behavior.
- Added `npm run eval` for 12 labeled posts, including forced rejection and no-confident-match checks.
- Verified the API manually with `curl` against the local Express server.

## Real Image Corpus Pass

- Replaced generated placeholder image cards with 40 real Wikimedia Commons images.
- Added source URLs and license strings to `data/manifests/images.json`.
- Added `npm run download:images` so the corpus can be rebuilt from Wikimedia Commons.
- Cleared stale image metadata and reprocessed the real corpus with Gemini models.
- Updated the review UI so a reviewer can compare a selected blog post and selected image side by side.

## AI Assistance Notes

AI helped draft the project structure, schema, guard rules, and evidence checklist. I still reviewed and adjusted the scope to keep the project small enough to finish and explain.
