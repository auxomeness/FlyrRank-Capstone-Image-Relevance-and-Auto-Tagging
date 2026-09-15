import crypto from "node:crypto";
import { query, withTransaction } from "./pool.js";

const rows = (result) => result.rows;
const one = (result) => result.rows[0] || null;

export async function upsertImage(image) {
  await query(
    `INSERT INTO images (id, file_path, source_url, license, expected_subject, expected_category)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET
       file_path = EXCLUDED.file_path,
       source_url = EXCLUDED.source_url,
       license = EXCLUDED.license,
       expected_subject = EXCLUDED.expected_subject,
       expected_category = EXCLUDED.expected_category`,
    [image.id, image.file_path, image.source_url, image.license, image.expected_subject, image.expected_category],
  );
}

export async function upsertPost(post) {
  return one(
    await query(
      `INSERT INTO posts (id, title, body, expected_subject, expected_category)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         body = EXCLUDED.body,
         expected_subject = EXCLUDED.expected_subject,
         expected_category = EXCLUDED.expected_category
       RETURNING *`,
      [post.id, post.title, post.body, post.expected_subject || null, post.expected_category || null],
    ),
  );
}

export async function listImages() {
  return rows(await query("SELECT * FROM images ORDER BY id"));
}

export async function getImage(id) {
  return one(await query("SELECT * FROM images WHERE id = $1", [id]));
}

export async function listPosts() {
  return rows(await query("SELECT * FROM posts ORDER BY id"));
}

export async function getPost(id) {
  return one(await query("SELECT * FROM posts WHERE id = $1", [id]));
}

export async function saveImageMetadata(imageId, metadata, status, failureReason, model) {
  await query(
    `INSERT INTO image_metadata (image_id, subject, category, attributes, caption, confidence, status, failure_reason, model)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (image_id) DO UPDATE SET
       subject = EXCLUDED.subject,
       category = EXCLUDED.category,
       attributes = EXCLUDED.attributes,
       caption = EXCLUDED.caption,
       confidence = EXCLUDED.confidence,
       status = EXCLUDED.status,
       failure_reason = EXCLUDED.failure_reason,
       model = EXCLUDED.model,
       processed_at = now()`,
    [
      imageId,
      metadata.subject,
      metadata.category,
      JSON.stringify(metadata.attributes),
      metadata.caption,
      metadata.confidence,
      status,
      failureReason,
      model,
    ],
  );
}

export async function saveImageVector(imageId, embedding, model) {
  await query(
    `INSERT INTO image_vectors (image_id, embedding, model)
     VALUES ($1, $2, $3)
     ON CONFLICT (image_id) DO UPDATE SET embedding = EXCLUDED.embedding, model = EXCLUDED.model, created_at = now()`,
    [imageId, JSON.stringify(embedding), model],
  );
}

export async function savePostVector(postId, embedding, model) {
  await query(
    `INSERT INTO post_vectors (post_id, embedding, model)
     VALUES ($1, $2, $3)
     ON CONFLICT (post_id) DO UPDATE SET embedding = EXCLUDED.embedding, model = EXCLUDED.model, created_at = now()`,
    [postId, JSON.stringify(embedding), model],
  );
}

export async function getPostWithVector(postId) {
  return one(
    await query(
      `SELECT p.*, pv.embedding AS post_embedding
       FROM posts p
       LEFT JOIN post_vectors pv ON pv.post_id = p.id
       WHERE p.id = $1`,
      [postId],
    ),
  );
}

export async function listImagesWithVectors() {
  return rows(
    await query(
      `SELECT i.*, m.subject, m.category, m.attributes, m.caption, m.confidence, m.status,
              iv.embedding AS image_embedding
       FROM images i
       JOIN image_metadata m ON m.image_id = i.id
       JOIN image_vectors iv ON iv.image_id = i.id
       WHERE m.status IN ('accepted', 'flagged')
       ORDER BY i.id`,
    ),
  );
}

export async function createJob(type, total) {
  const id = crypto.randomUUID();
  return one(
    await query(
      `INSERT INTO jobs (id, type, status, total)
       VALUES ($1, $2, 'queued', $3)
       RETURNING *`,
      [id, type, total],
    ),
  );
}

export async function getJob(id) {
  return one(await query("SELECT * FROM jobs WHERE id = $1", [id]));
}

export async function updateJob(id, patch) {
  const assignments = [];
  const values = [];
  Object.entries(patch).forEach(([key, value], index) => {
    assignments.push(`${key} = $${index + 2}`);
    values.push(value);
  });
  return one(await query(`UPDATE jobs SET ${assignments.join(", ")} WHERE id = $1 RETURNING *`, [id, ...values]));
}

export async function incrementJob(id, field) {
  await query(`UPDATE jobs SET ${field} = ${field} + 1 WHERE id = $1`, [id]);
}

export async function logCost({ jobId, callType, provider, model, inputUnits = 0, outputUnits = 0, cost = 0, status }) {
  await query(
    `INSERT INTO cost_logs (id, job_id, call_type, provider, model, input_units, output_units, estimated_cost_usd, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [crypto.randomUUID(), jobId || null, callType, provider, model, inputUnits, outputUnits, cost, status],
  );
}

export async function getCostSummary(jobId) {
  return rows(
    await query(
      `SELECT call_type, provider, model, status, COUNT(*)::int AS calls,
              COALESCE(SUM(estimated_cost_usd), 0)::float AS estimated_cost_usd
       FROM cost_logs
       WHERE ($1::text IS NULL OR job_id = $1)
       GROUP BY call_type, provider, model, status
       ORDER BY call_type, model, status`,
      [jobId || null],
    ),
  );
}

export async function saveSuggestions(postId, suggestions) {
  return withTransaction(async (client) => {
    await client.query("DELETE FROM suggestions WHERE post_id = $1", [postId]);
    const saved = [];
    for (const suggestion of suggestions) {
      const result = await client.query(
        `INSERT INTO suggestions (id, post_id, image_id, rank, similarity, decision, reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          crypto.randomUUID(),
          postId,
          suggestion.image_id || null,
          suggestion.rank,
          suggestion.similarity,
          suggestion.decision,
          suggestion.reason,
        ],
      );
      saved.push(result.rows[0]);
    }
    return saved;
  });
}

export async function getSuggestion(id) {
  return one(await query("SELECT * FROM suggestions WHERE id = $1", [id]));
}

export async function reviewSuggestion(id, status, note) {
  return one(
    await query(
      `INSERT INTO reviews (id, suggestion_id, status, note)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [crypto.randomUUID(), id, status, note || null],
    ),
  );
}
