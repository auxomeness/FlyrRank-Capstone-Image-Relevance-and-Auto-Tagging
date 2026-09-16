import { readFile } from "node:fs/promises";
import { config } from "../config.js";

const baseUrl = "https://generativelanguage.googleapis.com/v1beta";

function assertKey() {
  if (!config.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is required when AI_PROVIDER=gemini");
  }
}

async function requestGemini(path, payload) {
  assertKey();
  const response = await fetch(`${baseUrl}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": config.geminiApiKey,
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Gemini request failed: ${response.status} ${JSON.stringify(body)}`);
  }
  return body;
}

export function createGeminiProvider() {
  return {
    name: "gemini",
    visionModel: config.geminiVisionModel,
    embeddingModel: config.geminiEmbeddingModel,

    async classifyImage(image) {
      const bytes = await readFile(image.file_path);
      const body = await requestGemini(`models/${config.geminiVisionModel}:generateContent`, {
        generationConfig: {
          temperature: 0,
          response_mime_type: "application/json",
        },
        contents: [
          {
            parts: [
              {
                text:
                  "Return only JSON with subject, category, attributes, caption, confidence. Category should be one broad lowercase word. Confidence is 0 to 1.",
              },
              {
                inline_data: {
                  mime_type: "image/png",
                  data: bytes.toString("base64"),
                },
              },
            ],
          },
        ],
      });

      const parsed = JSON.parse(body.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
      return Array.isArray(parsed) ? parsed[0] || {} : parsed;
    },

    async embedText(text) {
      const body = await requestGemini(`models/${config.geminiEmbeddingModel}:embedContent`, {
        taskType: "SEMANTIC_SIMILARITY",
        content: {
          parts: [{ text }],
        },
      });

      const embedding = body.embedding?.values || body.embeddings?.[0]?.values;
      if (!Array.isArray(embedding)) {
        throw new Error("Gemini embedding response did not include a vector");
      }
      return embedding;
    },
  };
}
