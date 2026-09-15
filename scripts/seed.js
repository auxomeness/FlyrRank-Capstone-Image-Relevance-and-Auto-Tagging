import { readFile } from "node:fs/promises";
import path from "node:path";
import { createAiProvider } from "../src/ai/provider.js";
import { upsertImage, upsertPost, savePostVector } from "../src/db/repository.js";
import { pool } from "../src/db/pool.js";

const images = JSON.parse(await readFile("data/manifests/images.json", "utf8"));
const posts = JSON.parse(await readFile("data/manifests/posts.json", "utf8"));
const provider = await createAiProvider();

for (const image of images) {
  await upsertImage({
    id: image.id,
    file_path: path.join("data/images", image.file),
    source_url: "generated-locally",
    license: "owned generated placeholder for capstone evaluation",
    expected_subject: image.subject,
    expected_category: image.category,
  });
}

for (const post of posts) {
  await upsertPost(post);
  const embedding = await provider.embedText(`${post.title}. ${post.body}`);
  await savePostVector(post.id, embedding, provider.embeddingModel);
}

await pool.end();
console.log(`Seeded ${images.length} images and ${posts.length} posts.`);
