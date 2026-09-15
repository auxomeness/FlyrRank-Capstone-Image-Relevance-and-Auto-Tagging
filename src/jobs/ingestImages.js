import path from "node:path";
import { config } from "../config.js";
import {
  createJob,
  incrementJob,
  listImagesNeedingIngestion,
  logCost,
  saveImageMetadata,
  saveImageVector,
  updateJob,
} from "../db/repository.js";
import { createAiProvider } from "../ai/provider.js";
import { imageMetadataSchema } from "../domain/schemas.js";

async function withRetry(action, retries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await action(attempt);
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  throw lastError;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runImageIngestion(jobId = null) {
  const images = await listImagesNeedingIngestion();
  const job = jobId ? { id: jobId } : await createJob("image_ingestion", images.length);
  const provider = await createAiProvider();
  let calls = 0;

  await updateJob(job.id, { status: "running", started_at: new Date() });

  try {
    for (const image of images) {
      if (calls >= config.budgetMaxCallsPerJob) {
        throw new Error("Budget guard stopped the job before exceeding max AI calls.");
      }

      const imageForProvider = { ...image, file_path: path.resolve(image.file_path) };
      try {
        const metadata = await withRetry(async () => {
          calls += 1;
          const raw = await provider.classifyImage(imageForProvider);
          const parsed = imageMetadataSchema.safeParse(raw);
          if (!parsed.success) throw new Error(parsed.error.message);
          return parsed.data;
        });

        const status = metadata.confidence < config.visionConfidenceThreshold ? "flagged" : "accepted";
        const failureReason = status === "flagged" ? "Low confidence classification" : null;
        await saveImageMetadata(image.id, metadata, status, failureReason, provider.visionModel);
        await logCost({
          jobId: job.id,
          callType: "vision",
          provider: provider.name,
          model: provider.visionModel,
          inputUnits: 1,
          outputUnits: JSON.stringify(metadata).length,
          status,
        });

        const embedding = await withRetry(async () => {
          calls += 1;
          return provider.embedText(`${metadata.subject}. ${metadata.caption}. ${metadata.attributes.join(", ")}`);
        });
        await saveImageVector(image.id, embedding, provider.embeddingModel);
        await logCost({
          jobId: job.id,
          callType: "embedding",
          provider: provider.name,
          model: provider.embeddingModel,
          inputUnits: metadata.caption.length,
          outputUnits: embedding.length,
          status: "ok",
        });
        await incrementJob(job.id, "processed");
      } catch (error) {
        await incrementJob(job.id, "failed");
        await logCost({
          jobId: job.id,
          callType: "vision",
          provider: provider.name,
          model: provider.visionModel,
          status: "failed",
        });
        await saveImageMetadata(
          image.id,
          {
            subject: image.expected_subject,
            category: image.expected_category,
            attributes: ["failed"],
            caption: "Image processing failed.",
            confidence: 0,
          },
          "failed",
          error.message,
          provider.visionModel,
        );
      }

      if (provider.name === "gemini") {
        await sleep(3500);
      }
    }

    return updateJob(job.id, { status: "complete", finished_at: new Date() });
  } catch (error) {
    return updateJob(job.id, { status: "failed", error: error.message, finished_at: new Date() });
  }
}
