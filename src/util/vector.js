export function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const length = Math.min(a.length, b.length);

  for (let i = 0; i < length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function textEmbedding(text, dimensions = 96) {
  const vector = Array.from({ length: dimensions }, () => 0);
  const words = String(text).toLowerCase().match(/[a-z0-9]+/g) || [];

  for (const word of words) {
    let hash = 2166136261;
    for (let i = 0; i < word.length; i += 1) {
      hash ^= word.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    vector[Math.abs(hash) % dimensions] += 1;
  }

  return vector;
}

export function parseEmbedding(value) {
  return Array.isArray(value) ? value : JSON.parse(value || "[]");
}
