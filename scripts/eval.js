import { readFile } from "node:fs/promises";
import { forceCheck, rankImagesForPost } from "../src/domain/matching.js";
import { pool } from "../src/db/pool.js";

const cases = JSON.parse(await readFile("data/evals/posts.json", "utf8"));
let scored = 0;
let top1Correct = 0;
let rejectionCorrect = 0;
let noMatchCorrect = 0;

for (const item of cases) {
  const result = await rankImagesForPost(item.post_id);
  const top = result.suggestions[0];

  if (item.expected_image_id) {
    scored += 1;
    if (top?.image_id === item.expected_image_id && top.decision === "suggested") {
      top1Correct += 1;
    }
  } else if (top?.decision === "no_confident_match") {
    noMatchCorrect += 1;
  }

  if (item.must_reject_image_id) {
    const forced = await forceCheck(item.post_id, item.must_reject_image_id);
    if (forced.decision === "rejected") rejectionCorrect += 1;
  }
}

const top1Precision = scored === 0 ? 0 : top1Correct / scored;

console.log(`Top-1 precision: ${top1Correct}/${scored} (${(top1Precision * 100).toFixed(1)}%)`);
console.log(`Forced rejection checks: ${rejectionCorrect}/${cases.filter((item) => item.must_reject_image_id).length}`);
console.log(`No confident match checks: ${noMatchCorrect}/${cases.filter((item) => !item.expected_image_id).length}`);

await pool.end();

if (top1Precision < 0.8 || rejectionCorrect < 10 || noMatchCorrect < 1) {
  process.exitCode = 1;
}
