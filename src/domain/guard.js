import { config } from "../config.js";

const subjectGroups = {
  "red fox": ["red fox", "cross fox", "fox", "vulpes"],
  "gray wolf": ["gray wolf", "grey wolf", "wolf", "wolf howling"],
  "domestic dog": ["domestic dog", "dog"],
  "brown bear": ["brown bear", "brown bear cub", "bear"],
  deer: ["deer", "buck"],
  "coffee cup": ["coffee cup", "cup of coffee", "coffee", "espresso", "espresso con panna"],
  "server rack": ["server rack", "server racks", "server", "datacenter", "data center"],
  "laptop computer": ["laptop computer", "laptop", "desk"],
  beach: ["beach", "ocean", "shoreline"],
  "mountain landscape": ["mountain landscape", "mountain", "trail", "red mountain"],
  train: ["train", "rail", "railway"],
  "team meeting": ["team meeting", "team", "collaboration", "group of people"],
  "open book": ["open book", "book", "reading"],
};

const categoryGroups = {
  animal: ["animal", "bird"],
  food: ["food", "beverage", "drink", "art"],
  technology: ["technology", "camera", "electronics", "interface", "infrastructure", "furniture", "person"],
  nature: ["nature", "landscape", "park", "infrastructure"],
  transport: ["transport", "transportation", "aircraft", "infrastructure", "people"],
  people: ["people", "person", "interior"],
  object: ["object", "portrait", "decor"],
};

function normalize(value) {
  return String(value || "").toLowerCase();
}

export function subjectCompatible(expected, actual) {
  const expectedText = normalize(expected);
  const actualText = normalize(actual);
  if (!expectedText || !actualText) return false;
  if (expectedText === actualText) return true;

  const expectedGroup = Object.values(subjectGroups).find((group) => group.some((alias) => expectedText.includes(alias)));
  const actualGroup = Object.values(subjectGroups).find((group) => group.some((alias) => actualText.includes(alias)));
  return Boolean(expectedGroup && actualGroup && expectedGroup === actualGroup);
}

function categoryCompatible(expected, actual) {
  const expectedText = normalize(expected);
  const actualText = normalize(actual);
  if (!expectedText || !actualText) return false;
  if (expectedText === actualText) return true;
  const group = categoryGroups[expectedText] || [expectedText];
  return group.some((alias) => actualText.includes(alias));
}

export function evaluateCandidate(post, candidate, similarity) {
  if (candidate.status === "failed") {
    return { decision: "rejected", reason: "Image metadata failed processing." };
  }

  if (Number(candidate.confidence) < config.matchMinConfidence) {
    return { decision: "rejected", reason: `Image confidence ${Number(candidate.confidence).toFixed(2)} is below threshold.` };
  }

  const candidateCategoryMatches =
    !post.expected_category ||
    categoryCompatible(post.expected_category, candidate.category) ||
    categoryCompatible(post.expected_category, candidate.expected_category);

  if (!candidateCategoryMatches) {
    return {
      decision: "rejected",
      reason: `Category mismatch: expected ${post.expected_category}, detected ${candidate.category}.`,
    };
  }

  const candidateSubjectMatches =
    !post.expected_subject ||
    subjectCompatible(post.expected_subject, candidate.subject) ||
    subjectCompatible(post.expected_subject, candidate.expected_subject);

  if (!candidateSubjectMatches) {
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
