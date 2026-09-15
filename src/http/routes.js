import crypto from "node:crypto";
import express from "express";
import {
  createJob,
  getCostSummary,
  getJob,
  getSuggestion,
  listImages,
  reviewSuggestion,
  upsertPost,
} from "../db/repository.js";
import { postCreateSchema, reviewSchema, formatZod } from "../domain/schemas.js";
import { forceCheck, rankImagesForPost } from "../domain/matching.js";
import { runImageIngestion } from "../jobs/ingestImages.js";
import { asyncHandler, HttpError } from "../util/http.js";

export const router = express.Router();

router.get(
  "/evidence/health",
  asyncHandler(async (req, res) => {
    const costs = await getCostSummary();
    res.json({
      status: "ok",
      service: "ai-image-understanding-content-matching",
      cost_log_groups: costs.length,
    });
  }),
);

router.post(
  "/jobs/ingest-images",
  asyncHandler(async (req, res) => {
    const images = await listImages();
    const job = await createJob("image_ingestion", images.length);
    setImmediate(() => {
      runImageIngestion(job.id).catch((error) => {
        console.error("Image ingestion job failed", { jobId: job.id, error });
      });
    });
    res.status(202).json(job);
  }),
);

router.get(
  "/jobs/:id",
  asyncHandler(async (req, res) => {
    const job = await getJob(req.params.id);
    if (!job) throw new HttpError(404, "Job not found");
    const costs = await getCostSummary(job.id);
    res.json({ job, costs });
  }),
);

router.post(
  "/posts",
  asyncHandler(async (req, res) => {
    const parsed = postCreateSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "Invalid post", formatZod(parsed.error));
    const post = await upsertPost({ ...parsed.data, id: parsed.data.id || crypto.randomUUID() });
    res.status(201).json(post);
  }),
);

router.get(
  "/posts/:id/images",
  asyncHandler(async (req, res) => {
    res.json(await rankImagesForPost(req.params.id));
  }),
);

router.post(
  "/posts/:id/images/:imageId/force-check",
  asyncHandler(async (req, res) => {
    res.json(await forceCheck(req.params.id, req.params.imageId));
  }),
);

router.post(
  "/suggestions/:id/approve",
  asyncHandler(async (req, res) => {
    const suggestion = await getSuggestion(req.params.id);
    if (!suggestion) throw new HttpError(404, "Suggestion not found");
    const parsed = reviewSchema.safeParse(req.body || {});
    if (!parsed.success) throw new HttpError(400, "Invalid review", formatZod(parsed.error));
    res.status(201).json(await reviewSuggestion(req.params.id, "approved", parsed.data.note));
  }),
);

router.post(
  "/suggestions/:id/reject",
  asyncHandler(async (req, res) => {
    const suggestion = await getSuggestion(req.params.id);
    if (!suggestion) throw new HttpError(404, "Suggestion not found");
    const parsed = reviewSchema.safeParse(req.body || {});
    if (!parsed.success) throw new HttpError(400, "Invalid review", formatZod(parsed.error));
    res.status(201).json(await reviewSuggestion(req.params.id, "rejected", parsed.data.note));
  }),
);
