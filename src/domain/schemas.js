import { z } from "zod";

export const imageMetadataSchema = z
  .object({
    subject: z.string().trim().min(1).max(80),
    category: z.string().trim().min(1).max(40),
    attributes: z.array(z.string().trim().min(1).max(40)).min(1).max(12),
    caption: z.string().trim().min(1).max(240),
    confidence: z.number().min(0).max(1),
  })
  .strict();

export const postCreateSchema = z.object({
  id: z.string().trim().min(1).max(80).optional(),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(3000),
  expected_subject: z.string().trim().min(1).max(80).optional(),
  expected_category: z.string().trim().min(1).max(40).optional(),
});

export const reviewSchema = z.object({
  note: z.string().trim().max(500).optional(),
});

export function formatZod(error) {
  return error.issues.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`).join("; ");
}
