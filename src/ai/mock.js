import { textEmbedding } from "../util/vector.js";

const synonyms = {
  "red fox": ["fox", "vulpes", "orange", "canid", "bushy"],
  "gray wolf": ["wolf", "pack", "howling", "gray", "canid"],
  "domestic dog": ["dog", "pet", "owner", "collar"],
  "coffee cup": ["coffee", "espresso", "mug", "brew"],
  "server rack": ["server", "backend", "datacenter", "network"],
  "laptop computer": ["laptop", "keyboard", "developer", "screen"],
  beach: ["beach", "ocean", "sand", "waves"],
  "mountain landscape": ["mountain", "trail", "peaks", "hike"],
  train: ["train", "rail", "station"],
  "team meeting": ["team", "meeting", "collaboration", "planning"],
  "open book": ["book", "reading", "study", "pages"],
};

export function createMockAiProvider(manifestById) {
  return {
    name: "mock",
    visionModel: "mock-vision-v1",
    embeddingModel: "mock-embedding-v1",

    async classifyImage(image) {
      const manifest = manifestById.get(image.id);
      const confidence = image.id === "object-clock-01" ? 0.52 : 0.92;
      return {
        subject: manifest.subject,
        category: manifest.category,
        attributes: manifest.attributes,
        caption: `A ${manifest.subject} image showing ${manifest.attributes.join(", ")}.`,
        confidence,
      };
    },

    async classifyImageBytes(image) {
      const filename = String(image.filename || "").toLowerCase();
      if (filename.includes("wolf")) {
        return {
          subject: "gray wolf",
          category: "animal",
          attributes: ["gray fur", "wild canid"],
          caption: "A gray wolf in an outdoor setting.",
          confidence: 0.94,
        };
      }
      if (filename.includes("fox")) {
        return {
          subject: "red fox",
          category: "animal",
          attributes: ["orange fur", "bushy tail"],
          caption: "A red fox standing outdoors.",
          confidence: 0.94,
        };
      }
      return {
        subject: "uploaded image",
        category: "object",
        attributes: ["user upload"],
        caption: "A user uploaded image for live checking.",
        confidence: 0.82,
      };
    },

    async embedText(text) {
      let enriched = String(text);
      for (const [subject, terms] of Object.entries(synonyms)) {
        const haystack = `${subject} ${terms.join(" ")}`;
        if (terms.some((term) => String(text).toLowerCase().includes(term)) || String(text).toLowerCase().includes(subject)) {
          enriched += ` ${subject} ${haystack}`;
        }
      }
      return textEmbedding(enriched);
    },
  };
}
