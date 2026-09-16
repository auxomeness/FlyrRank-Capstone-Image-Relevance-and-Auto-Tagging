import { createAiProvider } from "../ai/provider.js";
import { config } from "../config.js";
import { getImage, getPostWithVector, listImagesWithVectors, logCost, saveSuggestions } from "../db/repository.js";
import { evaluateCandidate } from "./guard.js";
import { imageMetadataSchema } from "./schemas.js";
import { HttpError } from "../util/http.js";
import { cosineSimilarity, parseEmbedding } from "../util/vector.js";
import { subjectCompatible } from "./guard.js";

function tokenize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3);
}

function parseAttributes(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function lexicalBoost(post, candidate) {
  const postTokens = new Set(tokenize(`${post.title} ${post.body} ${post.expected_subject || ""}`));
  const imageTokens = new Set(
    tokenize(`${candidate.subject} ${candidate.category} ${candidate.caption} ${parseAttributes(candidate.attributes).join(" ")}`),
  );
  let overlap = 0;
  for (const token of postTokens) {
    if (imageTokens.has(token)) overlap += 1;
  }

  const subjectBoost = post.expected_subject && subjectCompatible(post.expected_subject, candidate.subject) ? 0.12 : 0;
  const categoryBoost = post.expected_category && post.expected_category === candidate.category ? 0.04 : 0;
  const overlapBoost = Math.min(overlap * 0.025, 0.14);
  return subjectBoost + categoryBoost + overlapBoost;
}

function publicSuggestion(row, candidate = null) {
  return {
    id: row.id,
    image_id: row.image_id,
    rank: row.rank,
    similarity: Number(row.similarity),
    decision: row.decision,
    reason: row.reason,
    candidate: candidate
      ? {
          subject: candidate.subject,
          category: candidate.category,
          confidence: Number(candidate.confidence),
          caption: candidate.caption,
        }
      : null,
  };
}

export async function rankImagesForPost(postId) {
  const post = await getPostWithVector(postId);
  if (!post) throw new HttpError(404, "Post not found");
  if (!post.post_embedding) throw new HttpError(409, "Post has no embedding. Run seed or ingestion first.");

  const postVector = parseEmbedding(post.post_embedding);
  const candidates = await listImagesWithVectors();

  const ranked = candidates
    .map((candidate) => ({
      candidate,
      similarity: Math.min(1, cosineSimilarity(postVector, parseEmbedding(candidate.image_embedding)) + lexicalBoost(post, candidate)),
    }))
    .sort((a, b) => b.similarity - a.similarity);

  const accepted = [];
  const rejected = [];

  for (const item of ranked) {
    const guard = evaluateCandidate(post, item.candidate, item.similarity);
    const suggestion = {
      image_id: item.candidate.id,
      rank: accepted.length + rejected.length + 1,
      similarity: item.similarity,
      decision: guard.decision,
      reason: guard.reason,
    };

    if (guard.decision === "suggested") accepted.push({ ...suggestion, candidate: item.candidate });
    else rejected.push({ ...suggestion, candidate: item.candidate });
  }

  const selected = accepted.slice(0, 5);
  if (selected.length === 0) {
    selected.push({
      image_id: null,
      rank: 1,
      similarity: 0,
      decision: "no_confident_match",
      reason: rejected[0]?.reason || "No image cleared the mismatch guard.",
      candidate: null,
    });
  }

  const saved = await saveSuggestions(postId, selected);
  return {
    post_id: postId,
    status: selected[0].decision === "no_confident_match" ? "no_confident_match" : "suggestions",
    suggestions: saved.map((row, index) => publicSuggestion(row, selected[index]?.candidate)),
    rejected_preview: rejected.slice(0, 5).map((item) => ({
      image_id: item.image_id,
      similarity: Number(item.similarity.toFixed(4)),
      reason: item.reason,
    })),
  };
}

export async function forceCheck(postId, imageId) {
  const post = await getPostWithVector(postId);
  if (!post) throw new HttpError(404, "Post not found");
  const image = await getImage(imageId);
  if (!image) throw new HttpError(404, "Image not found");
  const candidates = await listImagesWithVectors();
  const candidate = candidates.find((item) => item.id === imageId);
  if (!candidate) throw new HttpError(409, "Image has no metadata/vector yet");

  const similarity = cosineSimilarity(parseEmbedding(post.post_embedding), parseEmbedding(candidate.image_embedding));
  const guard = evaluateCandidate(post, candidate, similarity);

  return {
    post_id: postId,
    image_id: imageId,
    similarity: Number(similarity.toFixed(4)),
    decision: guard.decision,
    reason: guard.reason,
    candidate: {
      subject: candidate.subject,
      category: candidate.category,
      confidence: Number(candidate.confidence),
      caption: candidate.caption,
    },
  };
}

export async function liveImageCheck(postId, upload) {
  const post = await getPostWithVector(postId);
  if (!post) throw new HttpError(404, "Post not found");
  if (!post.post_embedding) throw new HttpError(409, "Post has no embedding. Run seed or ingestion first.");

  let bytes;
  try {
    bytes = Buffer.from(upload.data_base64, "base64");
  } catch {
    throw new HttpError(400, "Invalid base64 image data");
  }

  if (!bytes.length) throw new HttpError(400, "Invalid base64 image data");
  if (bytes.length > config.liveUploadMaxBytes) {
    throw new HttpError(413, `Uploaded image is larger than ${config.liveUploadMaxBytes} bytes`);
  }

  const provider = await createAiProvider();
  let metadata;
  try {
    const raw = await provider.classifyImageBytes({
      bytes,
      mimeType: upload.mime_type,
      filename: upload.filename,
    });
    const parsed = imageMetadataSchema.safeParse(raw);
    if (!parsed.success) throw new Error(parsed.error.message);
    metadata = parsed.data;
    await logCost({
      callType: "live_vision",
      provider: provider.name,
      model: provider.visionModel,
      inputUnits: bytes.length,
      outputUnits: JSON.stringify(metadata).length,
      status: metadata.confidence < config.visionConfidenceThreshold ? "flagged" : "accepted",
    });
  } catch (error) {
    await logCost({
      callType: "live_vision",
      provider: provider.name,
      model: provider.visionModel,
      inputUnits: bytes.length,
      status: "failed",
    });
    throw new HttpError(502, "Live image analysis failed", error.message);
  }

  const embeddingText = `${metadata.subject}. ${metadata.caption}. ${metadata.attributes.join(", ")}`;
  const embedding = await provider.embedText(embeddingText);
  await logCost({
    callType: "live_embedding",
    provider: provider.name,
    model: provider.embeddingModel,
    inputUnits: embeddingText.length,
    outputUnits: embedding.length,
    status: "ok",
  });

  const candidate = {
    ...metadata,
    status: metadata.confidence < config.visionConfidenceThreshold ? "flagged" : "accepted",
  };
  const similarity = cosineSimilarity(parseEmbedding(post.post_embedding), embedding);
  const guard = evaluateCandidate(post, candidate, similarity);

  return {
    post_id: postId,
    source: "live_upload",
    decision: guard.decision,
    reason: guard.reason,
    similarity: Number(similarity.toFixed(4)),
    candidate: metadata,
    models: {
      vision: provider.visionModel,
      embedding: provider.embeddingModel,
    },
  };
}
