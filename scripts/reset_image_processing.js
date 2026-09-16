import { resetImageProcessing } from "../src/db/repository.js";
import { pool } from "../src/db/pool.js";

await resetImageProcessing();
await pool.end();

console.log("Cleared image metadata, image vectors, suggestions, and reviews.");
