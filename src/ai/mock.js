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
