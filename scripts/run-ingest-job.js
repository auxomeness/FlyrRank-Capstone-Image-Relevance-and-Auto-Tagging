import { runImageIngestion } from "../src/jobs/ingestImages.js";
import { getCostSummary } from "../src/db/repository.js";
import { pool } from "../src/db/pool.js";

const job = await runImageIngestion();
const costs = await getCostSummary(job.id);
console.log(JSON.stringify({ job, costs }, null, 2));
await pool.end();
