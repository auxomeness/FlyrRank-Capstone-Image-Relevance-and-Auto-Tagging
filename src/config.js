export const config = {
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL,
  aiProvider: process.env.AI_PROVIDER || "mock",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiVisionModel: process.env.GEMINI_VISION_MODEL || "gemini-1.5-flash",
  geminiEmbeddingModel: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001",
  visionConfidenceThreshold: Number(process.env.VISION_CONFIDENCE_THRESHOLD || 0.7),
  matchSimilarityThreshold: Number(process.env.MATCH_SIMILARITY_THRESHOLD || 0.58),
  matchMinConfidence: Number(process.env.MATCH_MIN_CONFIDENCE || 0.7),
  budgetMaxCallsPerJob: Number(process.env.BUDGET_MAX_CALLS_PER_JOB || 200),
};
