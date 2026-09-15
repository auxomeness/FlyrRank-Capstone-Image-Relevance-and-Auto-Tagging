import { readFile } from "node:fs/promises";
import { config } from "../config.js";
import { createGeminiProvider } from "./gemini.js";
import { createMockAiProvider } from "./mock.js";

export async function createAiProvider() {
  if (config.aiProvider === "gemini") {
    return createGeminiProvider();
  }

  const manifest = JSON.parse(await readFile("data/manifests/images.json", "utf8"));
  return createMockAiProvider(new Map(manifest.map((item) => [item.id, item])));
}
