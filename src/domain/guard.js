import { config } from "../config.js";

const subjectGroups = {
  "red fox": ["red fox", "fox", "vulpes"],
  "gray wolf": ["gray wolf", "wolf"],
  "domestic dog": ["domestic dog", "dog"],
  "brown bear": ["brown bear", "bear"],
  deer: ["deer"],
  "coffee cup": ["coffee cup", "coffee", "espresso"],
  "server rack": ["server rack", "server", "datacenter"],
  "laptop computer": ["laptop computer", "laptop"],
  beach: ["beach", "ocean"],
  "mountain landscape": ["mountain landscape", "mountain", "trail"],
  train: ["train", "rail"],
  "team meeting": ["team meeting", "team", "collaboration"],
  "open book": ["open book", "book", "reading"],
};

function normalize(value) {
  return String(value || "").toLowerCase();
}

export function subjectCompatible(expected, actual) {
  const expectedText = normalize(expected);
  const actualText = normalize(actual);
  if (!expectedText || !actualText) return false;
  if (expectedText === actualText) return true;

  const expectedGroup = Object.values(subjectGroups).find((group) => group.includes(expectedText));
  const actualGroup = Object.values(subjectGroups).find((group) => group.includes(actualText));
  return Boolean(expectedGroup && actualGroup && expectedGroup === actualGroup);
}

export function evaluateCandidate(post, candidate, similarity) {
  if (candidate.status === "failed") {
    return { decision: "rejected", reason: "Image metadata failed processing." };
  }

  if (Number(candidate.confidence) < config.matchMinConfidence) {
    return { decision: "rejected", reason: `Image confidence ${Number(candidate.confidence).toFixed(2)} is below threshold.` };
  }

  if (post.expected_category && candidate.category !== post.expected_category) {
    return {
      decision: "rejected",
      reason: `Category mismatch: expected ${post.expected_category}, detected ${candidate.category}.`,
    };
  }

  if (post.expected_subject && !subjectCompatible(post.expected_subject, candidate.subject)) {
    return {
      decision: "rejected",
      reason: `Subject mismatch: expected ${post.expected_subject}, detected ${candidate.subject}.`,
    };
  }

  if (similarity < config.matchSimilarityThreshold) {
    return {
      decision: "rejected",
      reason: `Similarity ${similarity.toFixed(3)} is below threshold ${config.matchSimilarityThreshold}.`,
    };
  }

  return {
    decision: "suggested",
    reason: `Candidate passed category, subject, confidence, and similarity checks.`,
  };
}
