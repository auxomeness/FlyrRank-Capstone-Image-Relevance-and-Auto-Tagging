import cors from "cors";
import express from "express";
import path from "node:path";
import { config } from "./config.js";
import { router } from "./http/routes.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "8mb" }));
app.use("/assets/images", express.static(path.resolve("data/images")));
app.use("/app", express.static(path.resolve("public")));

app.get("/", (req, res) => {
  res.json({
    name: "AI Image Understanding & Content Matching Engine",
    version: "1.0.0",
    frontend: "/app",
    endpoints: [
      "GET /evidence/health",
      "POST /jobs/ingest-images",
      "GET /jobs/:id",
      "POST /posts",
      "GET /posts/:id/images",
      "POST /posts/:id/images/:imageId/force-check",
      "POST /posts/:id/live-image-check",
      "POST /suggestions/:id/approve",
      "POST /suggestions/:id/reject",
    ],
  });
});

app.use(router);

app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: err.message || "Internal server error",
    details: err.details,
  });
});

app.listen(config.port, () => {
  console.log(`Capstone API listening on http://localhost:${config.port}`);
});
