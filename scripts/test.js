import assert from "node:assert/strict";
import { imageMetadataSchema, postCreateSchema } from "../src/domain/schemas.js";
import { evaluateCandidate, subjectCompatible } from "../src/domain/guard.js";

assert.equal(imageMetadataSchema.safeParse({
  subject: "red fox",
  category: "animal",
  attributes: ["orange fur"],
  caption: "A red fox in a forest",
  confidence: 0.9,
}).success, true);

assert.equal(imageMetadataSchema.safeParse({
  subject: "red fox",
  category: "animal",
  attributes: [],
  caption: "bad",
  confidence: 2,
}).success, false);

assert.equal(postCreateSchema.safeParse({ title: "", body: "" }).success, false);
assert.equal(subjectCompatible("red fox", "fox"), true);
assert.equal(subjectCompatible("red fox", "gray wolf"), false);

const post = { expected_subject: "red fox", expected_category: "animal" };
const fox = { subject: "red fox", category: "animal", confidence: 0.92, status: "accepted" };
const wolf = { subject: "gray wolf", category: "animal", confidence: 0.94, status: "accepted" };
const lowConfidence = { subject: "red fox", category: "animal", confidence: 0.2, status: "flagged" };

assert.equal(evaluateCandidate(post, fox, 0.9).decision, "suggested");
assert.equal(evaluateCandidate(post, wolf, 0.9).decision, "rejected");
assert.match(evaluateCandidate(post, wolf, 0.9).reason, /Subject mismatch/);
assert.equal(evaluateCandidate(post, lowConfidence, 0.9).decision, "rejected");
assert.equal(evaluateCandidate(post, fox, 0.1).decision, "rejected");

console.log("All tests passed.");
