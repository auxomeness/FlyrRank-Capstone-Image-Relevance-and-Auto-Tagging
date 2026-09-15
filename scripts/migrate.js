import { readFile } from "node:fs/promises";
import { pool } from "../src/db/pool.js";

const sql = await readFile("migrations/001_init.sql", "utf8");
await pool.query(sql);
await pool.end();
console.log("Database migrated.");
